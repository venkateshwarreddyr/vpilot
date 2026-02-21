"""
Azure Functions v4 entry point.
Uses ASGI adapter to run the FastAPI app.
"""

import azure.functions as func

from vpilot.app import app as fastapi_app

function_app = func.AsgiFunctionApp(
    app=fastapi_app,
    http_auth_level=func.AuthLevel.ANONYMOUS,  # Auth handled by our middleware
)
