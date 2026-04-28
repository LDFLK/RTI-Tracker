# test_file_service.py
import uuid
import pytest
from unittest.mock import MagicMock, patch
from src.services import GithubFileService
from src.core.exceptions import BadRequestException, InternalServerException
from github import GithubException

# Helper — bare GithubFileService instance with mocked GitHub repository
def _make_service(
    create_file_return=None,
    create_file_side_effect=None,
    get_contents_return=None,
    get_contents_side_effect=None,
    delete_file_return=None,
    delete_file_side_effect=None,
    update_file_return=None,
    update_file_side_effect=None,
) -> GithubFileService:
    """Builds a GithubFileService instance by mocking GitHub to avoid actual network calls."""
    with patch("src.services.github_file_service.Github") as MockGithub:
        mock_github_instance = MockGithub.return_value
        mock_repo = MagicMock()
        mock_github_instance.get_repo.return_value = mock_repo
        
        service = GithubFileService()
        
        # Set expected mock properties for the tests
        service.repository = mock_repo
        service.github_repository_name = "test-repo"
        service.branch = "main"

        if create_file_side_effect:
            service.repository.create_file.side_effect = create_file_side_effect
        elif create_file_return is not None:
            service.repository.create_file.return_value = create_file_return
        if get_contents_side_effect:
            service.repository.get_contents.side_effect = get_contents_side_effect
        elif get_contents_return is not None:
            service.repository.get_contents.return_value = get_contents_return
        if delete_file_side_effect:
            service.repository.delete_file.side_effect = delete_file_side_effect
        elif delete_file_return is not None:
            service.repository.delete_file.return_value = delete_file_return
        if update_file_side_effect:
            service.repository.update_file.side_effect = update_file_side_effect
        elif update_file_return is not None:
            service.repository.update_file.return_value = update_file_return
            
        return service

# service initialization test
def test_file_service_initialization():
    """Test that GithubFileService correctly initializes instance attributes."""
    # We patch Github so we don't actually hit the API or require real tokens
    with patch("src.services.github_file_service.Github") as mock_github:
        service = GithubFileService()
        assert hasattr(service, "github_token")
        assert hasattr(service, "github_repository_name")
        assert hasattr(service, "branch")
        assert hasattr(service, "github")
        assert hasattr(service, "repository")

# create_file tests
@pytest.mark.asyncio
async def test_create_file_success(make_github_content_file):
    """create_file returns correct relative and absolute paths on success."""
    file_path = "rti-templates/test-file.md"
    expected_absolute = f"https://github.com/test-repo/blob/main/{file_path}"

    content_file = make_github_content_file(file_path)
    service = _make_service(create_file_return={"content": content_file})

    result = await service.create_file(file_path=file_path, content=b"content")

    assert result["relative_path"] == file_path
    assert result["absolute_path"] == expected_absolute
    service.repository.create_file.assert_called_once()

@pytest.mark.asyncio
async def test_create_file_calls_create_file_with_correct_args(make_github_content_file):
    """create_file passes the correct path, message, content, and branch to the GitHub API."""
    file_content = b"# RTI Template"
    expected_path = "rti-templates/test-file.md"

    content_file = make_github_content_file(expected_path)
    service = _make_service(create_file_return={"content": content_file})

    await service.create_file(file_path=expected_path, content=file_content, message="Upload custom file")

    call_kwargs = service.repository.create_file.call_args.kwargs
    assert call_kwargs["path"] == expected_path
    assert call_kwargs["content"] == file_content
    assert call_kwargs["branch"] == "main"
    assert call_kwargs["message"] == "Upload custom file"

@pytest.mark.asyncio
async def test_create_file_raises_internal_exception_on_github_error():
    """create_file wraps GitHub API errors in InternalServerException."""
    service = _make_service(create_file_side_effect=GithubException(500, "GitHub API unavailable"))

    with pytest.raises(InternalServerException):
        await service.create_file(file_path="test.md", content=b"content")

@pytest.mark.asyncio
async def test_create_file_returns_empty_paths_when_content_file_is_none():
    """create_file returns empty strings when the GitHub response has no content object."""
    service = _make_service(create_file_return={"content": None})

    result = await service.create_file(file_path="test.md", content=b"content")

    assert result["relative_path"] == ""
    assert result["absolute_path"] == ""


# update_file tests
@pytest.mark.asyncio
async def test_update_file_success(make_github_content_file):
    """update_file returns correct relative and absolute paths on success."""
    file_path = "rti-templates/test-file.md"
    expected_absolute = f"https://github.com/test-repo/blob/main/{file_path}"

    content_file = make_github_content_file(file_path)
    service = _make_service(update_file_return={"content": content_file})

    result = await service.update_file(file_path=file_path, content=b"content", sha="abc123sha")

    assert result["relative_path"] == file_path
    assert result["absolute_path"] == expected_absolute
    service.repository.update_file.assert_called_once()

@pytest.mark.asyncio
async def test_update_file_calls_update_file_with_correct_args(make_github_content_file):
    """update_file passes correct path, content, sha and branch to GitHub API."""
    file_content = b"# Updated RTI"
    expected_path = "rti-templates/test-file.md"
    expected_sha = "abc123sha"

    content_file = make_github_content_file(expected_path)
    service = _make_service(update_file_return={"content": content_file})

    await service.update_file(file_path=expected_path, content=file_content, sha=expected_sha, message="Update custom content")

    service.repository.update_file.assert_called_once()
    call_kwargs = service.repository.update_file.call_args.kwargs
    assert call_kwargs["path"] == expected_path
    assert call_kwargs["content"] == file_content
    assert call_kwargs["sha"] == expected_sha
    assert call_kwargs["branch"] == "main"
    assert call_kwargs["message"] == "Update custom content"

@pytest.mark.asyncio
async def test_update_file_raises_internal_exception_on_github_error():
    """update_file wraps GitHub API errors in InternalServerException."""
    service = _make_service(update_file_side_effect=GithubException(500, "Update failed"))

    with pytest.raises(InternalServerException):
        await service.update_file(file_path="test.md", content=b"content", sha="sha")

@pytest.mark.asyncio
async def test_update_file_returns_empty_paths_when_content_file_is_none():
    """update_file returns empty strings when GitHub response has no content object."""
    service = _make_service(update_file_return={"content": None})

    result = await service.update_file(file_path="test.md", content=b"content", sha="sha")

    assert result["relative_path"] == ""
    assert result["absolute_path"] == ""

# delete_file tests
@pytest.mark.asyncio
async def test_delete_file_success(make_github_content_file):
    """delete_file returns True and calls delete_file on the GitHub repository."""
    file_path = "rti-templates/some-uuid.md"
    content_file = make_github_content_file(file_path)
    content_file.sha = "deadbeef"

    service = _make_service(get_contents_return=content_file)

    result = await service.delete_file(file_path=file_path)

    assert result is True
    service.repository.get_contents.assert_called_once_with(file_path, ref="main")
    service.repository.delete_file.assert_called_once_with(
        path=file_path,
        message=f"Remove file {file_path}",
        sha="deadbeef",
        branch="main"
    )

@pytest.mark.asyncio
async def test_delete_file_uses_correct_sha(make_github_content_file):
    """delete_file passes the SHA from get_contents into delete_file."""
    file_path = "rti-templates/another-uuid.md"
    expected_sha = "cafebabe1234"

    content_file = make_github_content_file(file_path)
    content_file.sha = expected_sha

    service = _make_service(get_contents_return=content_file)

    await service.delete_file(file_path=file_path)

    call_kwargs = service.repository.delete_file.call_args.kwargs
    assert call_kwargs["sha"] == expected_sha

@pytest.mark.asyncio
async def test_delete_file_returns_false_on_github_error():
    """delete_file returns False (instead of raising) when the GitHub API fails."""
    service = _make_service(get_contents_side_effect=GithubException(500, "GitHub unreachable"))

    result = await service.delete_file(file_path="rti-templates/some.md")

    assert result is False

@pytest.mark.asyncio
async def test_delete_file_returns_false_when_delete_fails(make_github_content_file):
    """delete_file returns False when get_contents succeeds but delete_file call fails."""
    content_file = make_github_content_file("rti-templates/some.md")

    service = _make_service(
        get_contents_return=content_file,
        delete_file_side_effect=GithubException(500, "Permission denied"),
    )

    result = await service.delete_file(file_path="rti-templates/some.md")

    assert result is False

# get_github_file_path — static helper
def test_get_github_file_path_builds_correct_url():
    """get_github_file_path assembles the expected GitHub blob URL."""
    url = GithubFileService.get_github_file_path(
        repo_name="org/repo",
        branch="main",
        file_path="rti-templates/abc.md"
    )
    assert url == "https://github.com/org/repo/blob/main/rti-templates/abc.md"

# read_file tests
@pytest.mark.asyncio
async def test_get_file_success(make_github_content_file):
    """read_file returns decoded content and SHA from the GitHub API."""
    file_path = f"rti-templates/test-file.md"
    expected_content = b"# Content"
    expected_sha = "sha123"

    contents = make_github_content_file(file_path)
    contents.decoded_content = expected_content
    contents.sha = expected_sha

    service = _make_service(get_contents_return=contents)

    result = await service.read_file(file_path=file_path)

    assert result["content"] == expected_content
    assert result["sha"] == expected_sha
    service.repository.get_contents.assert_called_once_with(file_path, ref="main")

@pytest.mark.asyncio
async def test_get_file_raises_internal_exception_on_github_error():
    """read_file wraps GitHub API errors in InternalServerException."""
    service = _make_service(get_contents_side_effect=GithubException(404, "Not Found"))

    with pytest.raises(InternalServerException):
        await service.read_file(file_path="rti-templates/test.md")

