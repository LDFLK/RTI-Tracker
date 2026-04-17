from typing import Dict
import uuid
from src.core import settings
from src.core.exceptions import BadRequestException, InternalServerException
from fastapi import UploadFile
from github import Github, GithubException
import logging

logger = logging.getLogger(__name__)

class GithubFileService:
    """
    This service is responsible for github file management throught REST APIs.
    """

    def __init__(self):
        self.github_token = settings.GITHUB_TOKEN
        self.github_repository_name = settings.GITHUB_REPO_NAME 
        self.branch = settings.GITHUB_BRANCH

        # access github repository
        self.github = Github(self.github_token)
        self.repository = self.github.get_repo(self.github_repository_name)

    ALLOWED_FILE_TYPES = ["text/markdown"]

    # helper
    @staticmethod
    def get_github_file_path(repo_name: str, branch: str, file_path: str) -> str:
        return f"https://github.com/{repo_name}/blob/{branch}/{file_path}"

    # upload file
    async def upload_file(self, template_id: uuid, file: UploadFile) -> Dict:
        """Uploads a Markdown file to the GitHub repository under rti-templates/<uuid>.md and returns its relative and absolute paths."""

        # validate the file type
        if file.content_type not in self.ALLOWED_FILE_TYPES:
            raise BadRequestException(f'{file.content_type} is not allowed')
        
        try:
            # read the file content
            content = await file.read()

            # define the file path
            file_path = f"rti-templates/{template_id}.md"

            # upload to github
            response = self.repository.create_file(
                path=file_path,
                message=f"Upload file {file.filename}",
                content=content,
                branch=self.branch
            )

            content_file = response.get("content", None)
            relative_path = content_file.path if content_file is not None else None

            if relative_path is not None:
                absolute_path = GithubFileService.get_github_file_path(
                    repo_name=self.github_repository_name,
                    branch=self.branch,
                    file_path=relative_path
                    )

                final_response = {
                    "relative_path": relative_path,
                    "absolute_path": absolute_path
                }

                return final_response
            else:
                return {
                    "relative_path": "",
                    "absolute_path": ""
                }

        except GithubException as e:
            logger.error(f"[FILE SERVICE] Error uploading file to github: {e}")
            raise InternalServerException("[FILE SERVICE] Failed to upload file to github") from e
    
    # update file
    async def update_file(self, template_id, file: UploadFile) -> Dict:
        """Updates a Markdown file in the GitHub repository under rti-templates directory and returns its relative and absolute paths."""

        # validate the file type
        if file.content_type not in self.ALLOWED_FILE_TYPES:
            raise BadRequestException(f'{file.content_type} is not allowed')

        try:
            # define the file path
            content = await file.read()
            file_path = f"rti-templates/{template_id}.md"

            existing_file = await self.get_file(template_id)

            # update the existing file
            response = self.repository.update_file(
                path=file_path,
                message=f"Update content of {file.filename}",
                content=content,
                sha=existing_file["sha"],
                branch=self.branch
            )
            
            content_file = response.get("content", None)
            relative_path = content_file.path if content_file is not None else None

            if relative_path is not None:
                absolute_path = self.get_github_file_path(
                    repo_name=self.github_repository_name,
                    branch=self.branch,
                    file_path=relative_path
                    )

                final_response = {
                    "relative_path": relative_path,
                    "absolute_path": absolute_path
                }

                return final_response
            else:
                return {
                    "relative_path": "",
                    "absolute_path": ""
                }

        except GithubException as e:
            logger.error(f"[FILE SERVICE] Error updating file to github: {e}")
            raise InternalServerException("[FILE SERVICE] Failed to update file to github") from e
    
    # delete file
    async def delete_file(self, file_path: str) -> bool:
        """Deletes a file from the GitHub repository. Used as a compensating transaction on downstream failure. Returns False instead of raising if the cleanup itself fails."""
        try:
            contents = self.repository.get_contents(file_path, ref=self.branch)
            self.repository.delete_file(
                path=file_path,
                message=f"Rollback: remove orphaned file {file_path}",
                sha=contents.sha,
                branch=self.branch
            )
            logger.info(f"[FILE SERVICE] Compensating transaction: deleted {file_path} from github")
            return True
        except GithubException as e:
            logger.error(f"[FILE SERVICE] Compensating transaction failed — could not delete {file_path}: {e}")
            return False

    # get file
    async def get_file(self, template_id: uuid.UUID) -> Dict:
        """Fetches the content and SHA of a file from GitHub."""
        try:
            file_path = f"rti-templates/{template_id}.md"
            contents = self.repository.get_contents(file_path, ref=self.branch)
            return {
                "content": contents.decoded_content,
                "sha": contents.sha
            }
        except GithubException as e:
            logger.error(f"[FILE SERVICE] Error fetching file from github: {e}")
            raise InternalServerException("[FILE SERVICE] Failed to fetch file from github") from e

    # restore file
    async def restore_file(self, template_id: uuid.UUID, content: bytes, sha: str) -> bool:
        """Restores a file to a previous state. Used as a compensating transaction."""
        try:
            file_path = f"rti-templates/{template_id}.md"
            self.repository.update_file(
                path=file_path,
                message=f"Rollback: restore previous version of {template_id}.md",
                content=content,
                sha=sha,
                branch=self.branch
            )
            logger.info(f"[FILE SERVICE] Compensating transaction: restored {file_path} on github")
            return True
        except GithubException as e:
            logger.error(f"[FILE SERVICE] Compensating transaction failed — could not restore {template_id}.md: {e}")
            return False

