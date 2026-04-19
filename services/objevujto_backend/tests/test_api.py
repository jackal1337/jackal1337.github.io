from __future__ import annotations

import json
import tempfile
import threading
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from services.objevujto_backend.app.config import Settings
from services.objevujto_backend.app.server import ObjevujToRequestHandler, ObjevujToServer

REPO_ROOT = Path(__file__).resolve().parents[3]
SEED_PATH = REPO_ROOT / "services" / "objevujto_backend" / "data" / "seed_content.json"


class ApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.temp_dir = tempfile.TemporaryDirectory()
        settings = Settings(
            host="127.0.0.1",
            port=0,
            database_path=Path(cls.temp_dir.name) / "test.sqlite3",
            seed_path=SEED_PATH,
            auth_mode="stub",
            allow_seed_on_startup=True,
        )
        cls.server = ObjevujToServer((settings.host, settings.port), ObjevujToRequestHandler, settings=settings)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}"
        time.sleep(0.1)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)
        cls.temp_dir.cleanup()

    def request_json(self, path: str, *, method: str = "GET", body: dict | None = None, headers: dict[str, str] | None = None):
        data = json.dumps(body).encode("utf-8") if body is not None else None
        request = Request(f"{self.base_url}{path}", data=data, method=method)
        request.add_header("Content-Type", "application/json")
        for key, value in (headers or {}).items():
            request.add_header(key, value)
        with urlopen(request) as response:
            return response.status, json.loads(response.read().decode("utf-8"))

    def test_public_site_contract(self) -> None:
        status, payload = self.request_json("/api/public/site")
        self.assertEqual(status, 200)
        self.assertEqual(payload["site"]["title"], "ObjevujTo")
        self.assertIn("featured_places", payload["homepage"])

    def test_admin_session_with_stub_headers(self) -> None:
        status, payload = self.request_json(
            "/api/admin/session",
            headers={"X-Objevujto-Dev-User": "tester", "X-Objevujto-Dev-Role": "admin"},
        )
        self.assertEqual(status, 200)
        self.assertTrue(payload["authenticated"])
        self.assertEqual(payload["user"]["user_id"], "tester")

    def test_admin_create_and_publish_place(self) -> None:
        auth_headers = {"X-Objevujto-Dev-User": "tester", "X-Objevujto-Dev-Role": "admin"}
        _, created = self.request_json(
            "/api/admin/places",
            method="POST",
            body={
                "title": "Test místo",
                "status": "draft",
                "category_id": "cat_towns",
                "region_id": "region_red_county",
            },
            headers=auth_headers,
        )
        place_id = created["item"]["id"]
        self.assertEqual(created["item"]["slug"], "test-misto")

        _, published = self.request_json(
            f"/api/admin/places/{place_id}/publish",
            method="POST",
            headers=auth_headers,
        )
        self.assertEqual(published["item"]["status"], "published")

        _, detail = self.request_json("/api/public/places/test-misto")
        self.assertEqual(detail["item"]["title"], "Test místo")


if __name__ == "__main__":
    unittest.main()
