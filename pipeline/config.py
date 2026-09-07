import os
from pathlib import Path
from dotenv import load_dotenv

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
PIPELINE_DIR = BASE_DIR / "pipeline"
DB_DIR = BASE_DIR / "db"
OBSIDIAN_VAULT_DIR = BASE_DIR / "Obsidian_Brain"

# Load .env from root or pipeline directory
load_dotenv(BASE_DIR / ".env")
load_dotenv(PIPELINE_DIR / ".env")

# Database Configuration (Local Supabase PostgreSQL)
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "55322"))
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_NAME = os.getenv("DB_NAME", "postgres")

# Fallback SQLite DB path if PostgreSQL is temporarily unreachable
SQLITE_DB_PATH = BASE_DIR / "db" / "local_cache.db"
