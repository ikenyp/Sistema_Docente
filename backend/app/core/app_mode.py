from fastapi import Request

from app.core.config import settings


VALID_APP_MODES = {"institucional", "personal"}


def resolve_app_mode(request: Request | None = None) -> str:
    if request is not None:
        requested_mode = (request.headers.get("x-app-mode") or "").strip().lower()
        if requested_mode in VALID_APP_MODES:
            return requested_mode

    return settings.APP_MODE


def is_personal_mode(request: Request | None = None) -> bool:
    return resolve_app_mode(request) == "personal"
