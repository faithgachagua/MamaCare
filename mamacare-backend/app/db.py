from pathlib import Path
from typing import Generator

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlmodel import Session, create_engine

from .core.config import settings

engine = create_engine(settings.database_url, echo=False)

_BACKEND_ROOT = Path(__file__).resolve().parent.parent


def run_migrations() -> None:
    """Bring the database to the latest schema.

    A database created before migrations existed (by the old create_all) has
    the baseline tables but no alembic_version table, so mark it as baseline
    first and let the newer migrations upgrade it.
    """
    cfg = Config(str(_BACKEND_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(_BACKEND_ROOT / "alembic"))
    with engine.begin() as connection:
        cfg.attributes["connection"] = connection
        tables = set(inspect(connection).get_table_names())
        if "user" in tables and "alembic_version" not in tables:
            command.stamp(cfg, "0001")
        command.upgrade(cfg, "head")


def init_db() -> None:
    run_migrations()


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
