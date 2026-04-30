import importlib
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest

REQUIRED_ENV = {
    "ALLOWED_ORIGINS": "http://localhost:5173",
    "POSTGRES_HOST": "localhost:5432",
    "POSTGRES_USER": "rti",
    "POSTGRES_PASSWORD": "rti",
    "POSTGRES_DB": "rti",
    "ASGARDEO_ORG": "org",
    "CLIENT_ID": "client-id",
    "CLIENT_SECRET": "client-secret",
    "GITHUB_TOKEN": "token",
    "GITHUB_REPO_NAME": "repo",
    "GITHUB_BRANCH": "main",
}


def load_main_module(monkeypatch):
    for key, value in REQUIRED_ENV.items():
        monkeypatch.setenv(key, value)

    import_chain = [
        "src.core.configs",
        "src.core",
        "main",
        "src.utils.lifespan_helpers",
    ]

    # clear the full import chain so settings reloads with fresh env vars
    for module_name in import_chain:
        if module_name in sys.modules:
            del sys.modules[module_name]

    return importlib.import_module("main")


@pytest.mark.asyncio
async def test_lifespan_starts_when_db_ping_succeeds(monkeypatch):
    main = load_main_module(monkeypatch)

    ping_mock = MagicMock(return_value=None)
    to_thread_mock = AsyncMock(side_effect=lambda fn: fn())
    start_mock = AsyncMock()
    safe_close_mock = AsyncMock()
    safe_dispose_mock = MagicMock()
    sleep_mock = AsyncMock()

    monkeypatch.setattr(main, "MAX_RETRIES", 3)
    monkeypatch.setattr(main.asyncio, "to_thread", to_thread_mock)
    monkeypatch.setattr(main, "ping_db", ping_mock)
    monkeypatch.setattr(main.http_client, "start", start_mock)
    monkeypatch.setattr(main, "safe_close_http_client", safe_close_mock)
    monkeypatch.setattr(main, "safe_dispose_engine", safe_dispose_mock)
    monkeypatch.setattr(main.asyncio, "sleep", sleep_mock)

    async with main.lifespan(main.app):
        pass

    assert ping_mock.call_count == 1
    start_mock.assert_awaited_once()
    safe_close_mock.assert_awaited_once()
    safe_dispose_mock.assert_called_once()
    sleep_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_lifespan_retries_then_succeeds(monkeypatch):
    main = load_main_module(monkeypatch)

    ping_mock = MagicMock(side_effect=[Exception("db down"), None])
    to_thread_mock = AsyncMock(side_effect=lambda fn: fn())
    start_mock = AsyncMock()
    safe_close_mock = AsyncMock()
    safe_dispose_mock = MagicMock()
    sleep_mock = AsyncMock()

    monkeypatch.setattr(main, "MAX_RETRIES", 3)
    monkeypatch.setattr(main, "RETRY_DELAY", 0)
    monkeypatch.setattr(main.asyncio, "to_thread", to_thread_mock)
    monkeypatch.setattr(main, "ping_db", ping_mock)
    monkeypatch.setattr(main.http_client, "start", start_mock)
    monkeypatch.setattr(main, "safe_close_http_client", safe_close_mock)
    monkeypatch.setattr(main, "safe_dispose_engine", safe_dispose_mock)
    monkeypatch.setattr(main.asyncio, "sleep", sleep_mock)

    async with main.lifespan(main.app):
        pass

    assert ping_mock.call_count == 2
    sleep_mock.assert_awaited_once_with(0)
    start_mock.assert_awaited_once()
    safe_close_mock.assert_awaited_once()
    safe_dispose_mock.assert_called_once()


@pytest.mark.asyncio
async def test_lifespan_fails_fast_after_max_retries(monkeypatch):
    main = load_main_module(monkeypatch)

    ping_mock = MagicMock(side_effect=Exception("db down"))
    to_thread_mock = AsyncMock(side_effect=lambda fn: fn())
    start_mock = AsyncMock()
    safe_close_mock = AsyncMock()
    safe_dispose_mock = MagicMock()
    sleep_mock = AsyncMock()

    monkeypatch.setattr(main, "MAX_RETRIES", 3)
    monkeypatch.setattr(main, "RETRY_DELAY", 0)
    monkeypatch.setattr(main.asyncio, "to_thread", to_thread_mock)
    monkeypatch.setattr(main, "ping_db", ping_mock)
    monkeypatch.setattr(main.http_client, "start", start_mock)
    monkeypatch.setattr(main, "safe_close_http_client", safe_close_mock)
    monkeypatch.setattr(main, "safe_dispose_engine", safe_dispose_mock)
    monkeypatch.setattr(main.asyncio, "sleep", sleep_mock)

    with pytest.raises(RuntimeError, match="Cannot connect to database"):
        async with main.lifespan(main.app):
            pass

    assert ping_mock.call_count == 3
    assert sleep_mock.await_count == 2
    start_mock.assert_not_awaited()

    # http client never started → should NOT be closed
    safe_close_mock.assert_not_awaited()

    safe_dispose_mock.assert_called_once()


@pytest.mark.asyncio
async def test_lifespan_fails_if_http_client_fails(monkeypatch):
    main = load_main_module(monkeypatch)

    ping_mock = MagicMock(return_value=None)
    to_thread_mock = AsyncMock(side_effect=lambda fn: fn())
    start_mock = AsyncMock(side_effect=Exception("http client error"))
    safe_close_mock = AsyncMock()
    safe_dispose_mock = MagicMock()
    sleep_mock = AsyncMock()

    monkeypatch.setattr(main, "MAX_RETRIES", 3)
    monkeypatch.setattr(main.asyncio, "to_thread", to_thread_mock)
    monkeypatch.setattr(main, "ping_db", ping_mock)
    monkeypatch.setattr(main.http_client, "start", start_mock)
    monkeypatch.setattr(main, "safe_close_http_client", safe_close_mock)
    monkeypatch.setattr(main, "safe_dispose_engine", safe_dispose_mock)
    monkeypatch.setattr(main.asyncio, "sleep", sleep_mock)

    with pytest.raises(Exception, match="http client error"):
        async with main.lifespan(main.app):
            pass

    start_mock.assert_awaited_once()

    # http client never successfully started → should NOT be closed
    safe_close_mock.assert_not_awaited()

    safe_dispose_mock.assert_called_once()
