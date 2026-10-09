from datetime import datetime, timezone
from sqlalchemy import (Column, Integer, String, Text, DateTime, Boolean,
                        ForeignKey, Index, text)
from database import Base

def now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)          # admin, manager, staff
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=now)

class Workshop(Base):
    __tablename__ = "workshops"
    id = Column(Integer, primary_key=True)
    code = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    instructor = Column(String, nullable=False)
    location = Column(String, nullable=False)      # extra: they have 3 sites
    description = Column(Text, default="")         # extra
    starts_at = Column(DateTime, nullable=False)
    capacity = Column(Integer, nullable=False)
    status = Column(String, default="scheduled")   # scheduled, cancelled, completed
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

class Registration(Base):
    __tablename__ = "registrations"
    id = Column(Integer, primary_key=True)
    workshop_id = Column(Integer, ForeignKey("workshops.id"), nullable=False, index=True)
    attendee_name = Column(String, nullable=False)
    attendee_email = Column(String, nullable=False)
    status = Column(String, default="active", nullable=False)   # active, cancelled
    registered_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    registered_at = Column(DateTime, default=now, nullable=False)
    cancelled_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    __table_args__ = (
        # one ACTIVE registration per email per workshop; cancelled rows are exempt
        Index("uq_active_registration", "workshop_id", "attendee_email",
              unique=True, sqlite_where=text("status = 'active'")),
    )

class AuditLog(Base):                               # bonus: audit trail
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True)
    actor_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String, nullable=False)         # e.g. workshop.update
    entity = Column(String, nullable=False)
    entity_id = Column(Integer)
    detail = Column(Text, default="")
    created_at = Column(DateTime, default=now)