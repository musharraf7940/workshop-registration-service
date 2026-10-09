from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

engine = create_engine(
    "sqlite:///./workshops.db",
    connect_args={"check_same_thread": False, "timeout": 30},
)

@event.listens_for(engine, "connect")
def set_pragmas(dbapi_conn, _):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA journal_mode=WAL")
    cur.execute("PRAGMA foreign_keys=ON")
    cur.close()

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()