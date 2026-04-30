from typing import Dict
from src.core import settings
from src.core.exceptions import BadRequestException, InternalServerException
from github import Github, GithubException
import logging
import os

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

    # helper
    @staticmethod
    def get_github_file_path(repo_name: str, branch: str, file_path: str) -> str:
        return f"https://github.com/{repo_name}/blob/{branch}/{file_path}"

    # create file
    async def create_file(self, file_path: str, content: bytes, message: str = "Upload file") -> Dict:
        """Uploads a file to the GitHub repository and returns its relative and absolute paths."""
        try:
            # upload to github
            response = self.repository.create_file(
                path=file_path,
                message=message,
                content=content,
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

                return {
                    "relative_path": relative_path,
                    "absolute_path": absolute_path
                }
            else:
                return {
                    "relative_path": "",
                    "absolute_path": ""
                }

        except GithubException as e:
            logger.error(f"[FILE SERVICE] Error creating file on github: {e}")
            raise InternalServerException("[FILE SERVICE] Failed to create file on github") from e
    
    # update file
    async def update_file(self, file_path: str, content: bytes, sha: str, message: str = "Update content") -> Dict:
        """Updates a file in the GitHub repository and returns its relative and absolute paths."""
        try:
            # update the existing file
            response = self.repository.update_file(
                path=file_path,
                message=message,
                content=content,
                sha=sha,
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

                return {
                    "relative_path": relative_path,
                    "absolute_path": absolute_path
                }
            else:
                return {
                    "relative_path": "",
                    "absolute_path": ""
                }

        except GithubException as e:
            logger.error(f"[FILE SERVICE] Error updating file on github: {e}")
            raise InternalServerException("[FILE SERVICE] Failed to update file on github") from e
    
    # delete file
    async def delete_file(self, file_path: str) -> bool:
        """Deletes a file from the GitHub repository. Used as a compensating transaction on downstream failure. Returns False instead of raising if the cleanup itself fails."""
        try:
            contents = self.repository.get_contents(file_path, ref=self.branch)
            self.repository.delete_file(
                path=file_path,
                message=f"Remove file {file_path}",
                sha=contents.sha,
                branch=self.branch
            )
            logger.info(f"[FILE SERVICE] Compensating transaction: deleted {file_path} from github")
            return True
        except GithubException as e:
            logger.error(f"[FILE SERVICE] Compensating transaction failed — could not delete {file_path}: {e}")
            return False

    # get file
    async def read_file(self, file_path: str) -> Dict:
        """Fetches the content and SHA of a file from GitHub."""
        try:
            contents = self.repository.get_contents(file_path, ref=self.branch)
            _, ext = os.path.splitext(file_path)
            return {
                "content": contents.decoded_content,
                "sha": contents.sha,
                "extension": ext
            }
        except GithubException as e:
            logger.error(f"[FILE SERVICE] Error fetching file from github: {e}")
            raise InternalServerException("[FILE SERVICE] Failed to fetch file from github") from e

