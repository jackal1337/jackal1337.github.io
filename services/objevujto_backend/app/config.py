from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
APP_DIR = Path(__file__).resolve().parent
STATIC_DIR = APP_DIR / "static"
DEFAULT_ALLOWED_PUBLIC_ORIGINS = [
    "https://jackal1337.github.io",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
]


@dataclass(slots=True)
class Settings:
    host: str = os.getenv("OBJEVUJTO_BACKEND_HOST", "127.0.0.1")
    port: int = int(os.getenv("OBJEVUJTO_BACKEND_PORT", "8787"))
    database_path: Path = Path(os.getenv("OBJEVUJTO_BACKEND_DB", BASE_DIR / "data" / "objevujto.sqlite3"))
    seed_path: Path = Path(os.getenv("OBJEVUJTO_BACKEND_SEED", BASE_DIR / "data" / "seed_content.json"))
    auth_mode: str = os.getenv("OBJEVUJTO_AUTH_MODE", "stub")
    auth_base_url: str = os.getenv("OBJEVUJTO_AUTH_BASE_URL", "https://auth.notjackal.eu")
    public_base_url: str = os.getenv("OBJEVUJTO_PUBLIC_BASE_URL", "https://jackal1337.github.io/objevujto")
    admin_base_url: str = os.getenv("OBJEVUJTO_ADMIN_BASE_URL", "https://notjackal.eu/objevujto/admin")
    public_api_base_url: str = os.getenv("OBJEVUJTO_PUBLIC_API_BASE_URL", "https://notjackal.eu/objevujto/api/public")
    allow_seed_on_startup: bool = os.getenv("OBJEVUJTO_ALLOW_SEED_ON_STARTUP", "1") not in {"0", "false", "False"}
    public_cors_origins: list[str] = field(
        default_factory=lambda: [
            item.strip()
            for item in os.getenv("OBJEVUJTO_PUBLIC_CORS_ORIGINS", ",".join(DEFAULT_ALLOWED_PUBLIC_ORIGINS)).split(",")
            if item.strip()
        ]
    )


SETTINGS = Settings()
