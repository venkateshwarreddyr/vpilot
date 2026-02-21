"""
Azure Blob Storage for screenshots.
Uploads base64 image, returns a SAS URL valid for 24 hours.
Falls back gracefully when Blob is not configured.
"""

from __future__ import annotations

import base64
import uuid
from datetime import UTC, datetime, timedelta

import structlog
from azure.storage.blob import BlobSasPermissions, generate_blob_sas
from azure.storage.blob.aio import BlobServiceClient

from vpilot.settings import get_settings

log = structlog.get_logger()

_client: BlobServiceClient | None = None


def _get_client() -> BlobServiceClient | None:
    global _client
    settings = get_settings()
    if not settings.blob_connection_string or settings.blob_connection_string == "UseDevelopmentStorage=true":
        return None
    if _client is None:
        _client = BlobServiceClient.from_connection_string(settings.blob_connection_string)
    return _client


async def upload_screenshot(image_base64: str) -> str | None:
    """Upload base64 JPEG to blob, return SAS URL valid 24h."""
    client = _get_client()
    if not client:
        return None

    settings = get_settings()
    blob_name = f"screenshots/{uuid.uuid4()}.jpg"
    image_bytes = base64.b64decode(image_base64)

    try:
        container = client.get_container_client(settings.blob_container)
        await container.upload_blob(
            name=blob_name,
            data=image_bytes,
            content_type="image/jpeg",
            overwrite=True,
        )

        # Generate SAS URL
        account_name = client.account_name
        account_key = client.credential.account_key  # type: ignore[attr-defined]
        sas_token = generate_blob_sas(
            account_name=account_name,
            container_name=settings.blob_container,
            blob_name=blob_name,
            account_key=account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.now(UTC) + timedelta(hours=24),
        )
        return f"https://{account_name}.blob.core.windows.net/{settings.blob_container}/{blob_name}?{sas_token}"
    except Exception as e:
        log.warning("blob.upload.failed", error=str(e))
        return None
