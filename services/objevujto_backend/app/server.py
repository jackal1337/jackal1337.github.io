from __future__ import annotations

import json
import mimetypes
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, urlparse

from .auth import AuthAdapter, AuthError
from .config import SETTINGS, STATIC_DIR, Settings
from .database import Database
from .repository import Repository


def json_response(handler: BaseHTTPRequestHandler, payload: Any, status: int = HTTPStatus.OK, headers: dict[str, str] | None = None) -> None:
    body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    if headers:
        for key, value in headers.items():
            handler.send_header(key, value)
    handler.end_headers()
    if handler.command != "HEAD":
        handler.wfile.write(body)


class ObjevujToServer(ThreadingHTTPServer):
    def __init__(self, server_address, RequestHandlerClass, *, settings: Settings) -> None:  # noqa: N803
        super().__init__(server_address, RequestHandlerClass)
        self.settings = settings
        self.database = Database(settings)
        self.repository = Repository(self.database)
        self.auth = AuthAdapter(settings)


class ObjevujToRequestHandler(BaseHTTPRequestHandler):
    server: ObjevujToServer

    def do_OPTIONS(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = self._normalize_path(parsed.path.rstrip("/") or "/")
        self.send_response(HTTPStatus.NO_CONTENT)
        self._write_cors_headers(public=path.startswith("/api/public/"))
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, X-Objevujto-Dev-User, X-Objevujto-Dev-Role, X-Objevujto-Dev-Email, X-Authenticated-User, X-Authenticated-Role, X-Authenticated-Email, X-Authenticated-Name, X-Auth-User, X-Auth-User-Id, X-Auth-Role",
        )
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        self._dispatch_request("GET")

    def do_HEAD(self) -> None:  # noqa: N802
        self._dispatch_request("GET")

    def do_POST(self) -> None:  # noqa: N802
        self._dispatch_request("POST")

    def do_PUT(self) -> None:  # noqa: N802
        self._dispatch_request("PUT")

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return

    def _normalize_path(self, path: str) -> str:
        base_path = (self.server.settings.base_path or "").rstrip("/")
        if base_path and path == base_path:
            return "/"
        if base_path and path.startswith(f"{base_path}/"):
            stripped = path[len(base_path) :]
            return stripped.rstrip("/") or "/"
        return path

    def _dispatch_request(self, method: str) -> None:
        parsed = urlparse(self.path)
        raw_path = parsed.path.rstrip("/") or "/"
        path = self._normalize_path(raw_path)
        query = {key: values[-1] for key, values in parse_qs(parsed.query).items()}

        try:
            if path == "/admin" and not parsed.path.endswith("/"):
                self.send_response(HTTPStatus.MOVED_PERMANENTLY)
                self.send_header("Location", f"{parsed.path}/")
                self.end_headers()
                return
            if path == "/health":
                return json_response(self, {"ok": True})
            if path.startswith("/api/public"):
                payload = self._handle_public_api(method, path, query)
                return json_response(self, payload, headers=self._cors_headers(public=True))
            if path.startswith("/api/admin"):
                payload = self._handle_admin_api(method, path, query)
                return json_response(self, payload, headers=self._cors_headers(public=False))
            if path == "/admin" or path.startswith("/admin/"):
                return self._serve_static_admin(path)
            return self._not_found(f"Unknown path: {raw_path}")
        except AuthError as error:
            return json_response(self, {"error": error.message}, status=error.status, headers=self._cors_headers(public=path.startswith("/api/public")))
        except FileNotFoundError:
            return self._not_found("File not found")
        except ValueError as error:
            return json_response(self, {"error": str(error)}, status=HTTPStatus.BAD_REQUEST, headers=self._cors_headers(public=path.startswith("/api/public")))

    def _handle_public_api(self, method: str, path: str, query: dict[str, str]) -> Any:
        if method != "GET":
            raise ValueError("Public API is read-only")
        repo = self.server.repository
        settings = self.server.settings
        if path == "/api/public/site":
            return repo.get_public_site_payload()
        if path == "/api/public/places":
            filters = {
                "region": query.get("region"),
                "category": query.get("category"),
                "tag": query.get("tag"),
                "q": query.get("q"),
                "featured": query.get("featured") in {"1", "true", "True"},
            }
            return repo.list_places(filters, include_unpublished=False, page=int(query.get("page", "1")), limit=int(query.get("limit", "12")))
        if path.startswith("/api/public/places/"):
            slug = path.removeprefix("/api/public/places/")
            payload = repo.public_place_payload(slug, settings.public_base_url)
            if not payload:
                return self._not_found_json("Place not found")
            return payload
        if path == "/api/public/categories":
            return {"items": repo.list_taxonomy("categories")}
        if path == "/api/public/regions":
            return {"items": repo.list_taxonomy("regions")}
        if path == "/api/public/tags":
            return {"items": repo.list_taxonomy("tags")}
        if path == "/api/public/collections":
            return {"items": repo.list_collections()}
        return self._not_found_json("Public endpoint not found")

    def _handle_admin_api(self, method: str, path: str, query: dict[str, str]) -> Any:
        del query
        repo = self.server.repository
        auth = self.server.auth
        headers = {key: value for key, value in self.headers.items()}
        session = None
        cookies = self._cookies()
        if path != "/api/admin/session":
            session = auth.require_session(headers, cookies)

        if path == "/api/admin/session":
            session = auth.resolve_session(headers, cookies)
            login_url = auth.login_url(self.server.settings.admin_base_url)
            logout_url = auth.logout_url(self.server.settings.admin_base_url)
            return {
                "authenticated": bool(session),
                "user": {"user_id": session.user_id, "display_name": session.display_name, "role": session.role, "email": session.email} if session else None,
                "login_url": login_url,
                "logout_url": logout_url,
                "auth_mode": self.server.settings.auth_mode,
            }
        if path == "/api/admin/dashboard":
            return repo.dashboard_summary()
        if path == "/api/admin/places":
            if method == "GET":
                return {"items": repo.list_admin_places()}
            if method == "POST":
                auth.require_role(session, ("admin", "editor", "author"))
                return {"item": repo.create_place(self._json_body(), session.user_id)}
        if path.startswith("/api/admin/places/"):
            tail = path.removeprefix("/api/admin/places/")
            if tail.endswith("/revisions"):
                place_id = tail.removesuffix("/revisions")
                return {"items": repo.list_place_revisions(place_id)}
            if tail.endswith("/publish"):
                if method != "POST":
                    raise ValueError("Publish endpoint requires POST")
                auth.require_role(session, ("admin", "editor"))
                place_id = tail.removesuffix("/publish")
                item = repo.publish_place(place_id, session.user_id)
                if not item:
                    return self._not_found_json("Place not found")
                return {"item": item}
            place_id = tail
            if method == "GET":
                item = repo.get_place_by_id(place_id)
                if not item:
                    return self._not_found_json("Place not found")
                return {"item": item}
            if method == "PUT":
                auth.require_role(session, ("admin", "editor", "author"))
                item = repo.update_place(place_id, self._json_body(), session.user_id)
                if not item:
                    return self._not_found_json("Place not found")
                return {"item": item}
        if path == "/api/admin/categories":
            if method == "GET":
                return {"items": repo.list_taxonomy("categories")}
            if method == "POST":
                auth.require_role(session, ("admin", "editor"))
                return {"item": repo.create_taxonomy("categories", self._json_body())}
        if path == "/api/admin/regions":
            if method == "GET":
                return {"items": repo.list_taxonomy("regions")}
            if method == "POST":
                auth.require_role(session, ("admin", "editor"))
                return {"item": repo.create_taxonomy("regions", self._json_body())}
        if path == "/api/admin/tags":
            if method == "GET":
                return {"items": repo.list_taxonomy("tags")}
            if method == "POST":
                auth.require_role(session, ("admin", "editor"))
                return {"item": repo.create_taxonomy("tags", self._json_body())}
        if path == "/api/admin/media":
            if method == "GET":
                return {"items": repo.list_media()}
            if method == "POST":
                auth.require_role(session, ("admin", "editor", "author"))
                return {"item": repo.create_media(self._json_body())}
        if path == "/api/admin/users":
            return {"items": repo.list_users()}
        return self._not_found_json("Admin endpoint not found")

    def _serve_static_admin(self, path: str) -> None:
        relative_path = "index.html" if path in {"/admin", "/admin/"} else path.removeprefix("/admin/")
        if relative_path.startswith("/"):
            relative_path = relative_path[1:]
        file_path = (STATIC_DIR / "admin" / relative_path).resolve()
        admin_root = (STATIC_DIR / "admin").resolve()
        if admin_root not in file_path.parents and file_path != admin_root:
            return self._not_found("Invalid admin asset path")
        if file_path.is_dir():
            file_path = file_path / "index.html"
        if not file_path.exists():
            return self._not_found("Admin asset not found")
        content = file_path.read_bytes()
        mime_type, _ = mimetypes.guess_type(str(file_path))
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", mime_type or "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(content)

    def _json_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as error:
            raise ValueError(f"Invalid JSON body: {error.msg}") from error
        if not isinstance(payload, dict):
            raise ValueError("JSON body must be an object")
        return payload

    def _cookies(self) -> dict[str, str]:
        raw = self.headers.get("Cookie")
        if not raw:
            return {}
        cookie = SimpleCookie()
        cookie.load(raw)
        return {key: morsel.value for key, morsel in cookie.items()}

    def _not_found(self, message: str) -> None:
        json_response(self, {"error": message}, status=HTTPStatus.NOT_FOUND)

    def _not_found_json(self, message: str) -> dict[str, Any]:
        raise AuthError(HTTPStatus.NOT_FOUND, message)

    def _cors_headers(self, *, public: bool) -> dict[str, str]:
        headers: dict[str, str] = {}
        if public:
            origin = self.headers.get("Origin")
            if not origin:
                headers["Access-Control-Allow-Origin"] = "*"
            elif origin in self.server.settings.public_cors_origins:
                headers["Access-Control-Allow-Origin"] = origin
                headers["Vary"] = "Origin"
        return headers

    def _write_cors_headers(self, *, public: bool) -> None:
        for key, value in self._cors_headers(public=public).items():
            self.send_header(key, value)


def run_server(settings: Settings = SETTINGS) -> ObjevujToServer:
    server = ObjevujToServer((settings.host, settings.port), ObjevujToRequestHandler, settings=settings)
    print(f"ObjevujTo backend listening on http://{settings.host}:{settings.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return server
