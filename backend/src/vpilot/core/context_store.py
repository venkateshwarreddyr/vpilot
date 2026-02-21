"""
Azure Cosmos DB context store.
Stores conversation history per session and user preferences per device.
Falls back gracefully when Cosmos is not configured (local dev).
"""

from __future__ import annotations

import time
from typing import Any

import structlog
from azure.cosmos.aio import CosmosClient
from azure.cosmos.exceptions import CosmosHttpResponseError

from vpilot.settings import get_settings

log = structlog.get_logger()

_client: CosmosClient | None = None


def _get_client() -> CosmosClient | None:
    global _client
    settings = get_settings()
    if not settings.cosmos_endpoint or not settings.cosmos_key:
        return None
    if _client is None:
        _client = CosmosClient(settings.cosmos_endpoint, credential=settings.cosmos_key)
    return _client


async def save_conversation(session_id: str, messages: list[dict[str, Any]]) -> None:
    client = _get_client()
    if not client:
        return
    settings = get_settings()
    try:
        db = client.get_database_client(settings.cosmos_database)
        container = db.get_container_client("conversations")
        await container.upsert_item({
            "id": session_id,
            "session_id": session_id,
            "messages": messages,
            "updated_at": int(time.time()),
            "ttl": 30 * 24 * 3600,  # 30 days
        })
    except CosmosHttpResponseError as e:
        log.warning("cosmos.save_conversation.failed", error=str(e))


async def load_conversation(session_id: str) -> list[dict[str, Any]]:
    client = _get_client()
    if not client:
        return []
    settings = get_settings()
    try:
        db = client.get_database_client(settings.cosmos_database)
        container = db.get_container_client("conversations")
        item = await container.read_item(item=session_id, partition_key=session_id)
        return item.get("messages", [])  # type: ignore[return-value]
    except CosmosHttpResponseError:
        return []


async def save_user_prefs(device_id: str, prefs: dict[str, Any]) -> None:
    client = _get_client()
    if not client:
        return
    settings = get_settings()
    try:
        db = client.get_database_client(settings.cosmos_database)
        container = db.get_container_client("user_context")
        await container.upsert_item({
            "id": device_id,
            "device_id": device_id,
            "prefs": prefs,
            "updated_at": int(time.time()),
        })
    except CosmosHttpResponseError as e:
        log.warning("cosmos.save_user_prefs.failed", error=str(e))


async def load_user_prefs(device_id: str) -> dict[str, Any]:
    client = _get_client()
    if not client:
        return {}
    settings = get_settings()
    try:
        db = client.get_database_client(settings.cosmos_database)
        container = db.get_container_client("user_context")
        item = await container.read_item(item=device_id, partition_key=device_id)
        return item.get("prefs", {})  # type: ignore[return-value]
    except CosmosHttpResponseError:
        return {}
