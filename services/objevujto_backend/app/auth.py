from __future__ import annotations

from dataclasses import dataclass
from http import HTTPStatus
from typing import Mapping
from urllib.parse import urlencode

from .config import Settings


@dataclass(slots=True)
class Session:
    user_id: str
    display_name: str
    role: str
    email: str | None = None


class AuthError(Exception):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


class AuthAdapter:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def resolve_session(self, headers: Mapping[str, str], cookies: Mapping[str, str]) -> Session | None:
        mode = self.settings.auth_mode
        if mode == "stub":
            user = headers.get("X-Objevujto-Dev-User") or cookies.get("objevujto_dev_user")
            if not user:
                return None
            role = headers.get("X-Objevujto-Dev-Role") or cookies.get("objevujto_dev_role") or "admin"
            email = headers.get("X-Objevujto-Dev-Email") or cookies.get("objevujto_dev_email")
            return Session(user_id=user, display_name=user.replace("_", " ").title(), role=role, email=email)
        if mode == "forward_header":
            user = headers.get("X-Authenticated-User") or headers.get("X-Auth-User-Id") or headers.get("X-Auth-User")
            if not user:
                return None
            role = headers.get("X-Authenticated-Role") or headers.get("X-Auth-Role") or self.settings.auth_default_role
            email = headers.get("X-Authenticated-Email")
            name = headers.get("X-Authenticated-Name") or headers.get("X-Auth-User") or user
            return Session(user_id=user, display_name=name, role=role, email=email)
        return None

    def require_session(self, headers: Mapping[str, str], cookies: Mapping[str, str]) -> Session:
        session = self.resolve_session(headers, cookies)
        if not session:
            raise AuthError(HTTPStatus.UNAUTHORIZED, "Authentication required")
        return session

    def require_role(self, session: Session, allowed_roles: tuple[str, ...]) -> None:
        if session.role not in allowed_roles:
            raise AuthError(HTTPStatus.FORBIDDEN, "Insufficient permissions")

    def login_url(self, return_to: str) -> str:
        query = urlencode({"redirect_url": return_to})
        return f"{self.settings.auth_base_url.rstrip('/')}/api/auth/login?{query}"

    def logout_url(self, return_to: str) -> str:
        query = urlencode({"redirect": return_to})
        return f"{self.settings.auth_base_url.rstrip('/')}/api/auth/logout-redirect?{query}"
