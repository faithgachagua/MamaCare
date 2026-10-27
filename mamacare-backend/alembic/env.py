from alembic import context
from sqlalchemy import create_engine, pool
from sqlmodel import SQLModel

from app import models  # noqa: F401  (registers every table on SQLModel.metadata)
from app.core.config import settings

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = context.config.attributes.get("connection")
    if connectable is None:
        engine = create_engine(settings.database_url, poolclass=pool.NullPool)
        with engine.connect() as connection:
            _run(connection)
        return
    _run(connectable)


def _run(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
