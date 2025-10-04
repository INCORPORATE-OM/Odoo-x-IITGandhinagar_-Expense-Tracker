from sqlmodel import SQLModel, create_engine, Session
import os


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./expenses.db")
engine = create_engine(DATABASE_URL, echo=False)


def get_engine(database_url: str | None = None):
    """Return a SQLModel/SQLAlchemy engine. If database_url is provided, a new engine is created."""
    if database_url:
        return create_engine(database_url, echo=False)
    return engine


def init_db():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
