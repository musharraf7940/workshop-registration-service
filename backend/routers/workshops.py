from datetime import datetime, timezone
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, func, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from database import get_db
from models import User, Workshop, Registration
from auth import require_roles
import audit

router = APIRouter(prefix="/workshops", tags=["workshops"])

WStatus = Literal["scheduled", "cancelled", "completed"]
view_roles = require_roles("manager", "staff")   # admin is deliberately excluded
manager_only = require_roles("manager")

# ---------- helpers ----------
def utc_now_naive():
    return datetime.now(timezone.utc).replace(tzinfo=None)

def utc_naive(dt: datetime) -> datetime:
    if dt.tzinfo:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt

def iso(dt):
    return dt.isoformat() + "Z" if dt else None

def active_count_expr():
    return (select(func.count(Registration.id))
            .where(Registration.workshop_id == Workshop.id,
                   Registration.status == "active")
            .correlate(Workshop).scalar_subquery())

def workshop_out(w: Workshop, active: int):
    return {"id": w.id, "code": w.code, "title": w.title, "instructor": w.instructor,
            "location": w.location, "description": w.description,
            "starts_at": iso(w.starts_at), "capacity": w.capacity, "status": w.status,
            "seats_taken": active, "seats_available": max(w.capacity - active, 0)}

def load(db: Session, workshop_id: int):
    row = db.execute(select(Workshop, active_count_expr())
                     .where(Workshop.id == workshop_id)).first()
    if not row:
        raise HTTPException(404, "Workshop not found")
    return row[0], row[1]

def reg_out(r: Registration, names: dict):
    return {"id": r.id, "workshop_id": r.workshop_id,
            "attendee_name": r.attendee_name, "attendee_email": r.attendee_email,
            "status": r.status,
            "registered_by": names.get(r.registered_by), "registered_at": iso(r.registered_at),
            "cancelled_by": names.get(r.cancelled_by), "cancelled_at": iso(r.cancelled_at)}

def user_names(db: Session):
    return {u.id: u.name for u in db.query(User).all()}

# ---------- schemas ----------
class WorkshopCreate(BaseModel):
    code: str = Field(min_length=1)
    title: str = Field(min_length=1)
    instructor: str = Field(min_length=1)
    location: str = Field(min_length=1)
    description: str = ""
    starts_at: datetime
    capacity: int = Field(gt=0)

class WorkshopUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1)
    instructor: Optional[str] = Field(default=None, min_length=1)
    location: Optional[str] = Field(default=None, min_length=1)
    description: Optional[str] = None
    starts_at: Optional[datetime] = None
    capacity: Optional[int] = Field(default=None, gt=0)
    status: Optional[WStatus] = None

class RegisterRequest(BaseModel):
    attendee_name: str = Field(min_length=1)
    attendee_email: EmailStr

# ---------- workshops ----------
@router.get("")
def list_workshops(
    date_from: Optional[datetime] = Query(default=None, alias="from"),
    date_to: Optional[datetime] = Query(default=None, alias="to"),
    status: Optional[WStatus] = None,
    has_seats: Optional[bool] = None,
    db: Session = Depends(get_db),
    user: User = Depends(view_roles),
):
    active = active_count_expr()
    q = select(Workshop, active)
    if date_from:
        q = q.where(Workshop.starts_at >= utc_naive(date_from))
    if date_to:
        q = q.where(Workshop.starts_at <= utc_naive(date_to))
    if status:
        q = q.where(Workshop.status == status)
    if has_seats:
        q = q.where(Workshop.status == "scheduled", active < Workshop.capacity)
    rows = db.execute(q.order_by(Workshop.starts_at)).all()
    return [workshop_out(w, a) for w, a in rows]

@router.get("/{workshop_id}")
def get_workshop(workshop_id: int, db: Session = Depends(get_db),
                 user: User = Depends(view_roles)):
    w, active = load(db, workshop_id)
    return workshop_out(w, active)

@router.post("", status_code=201)
def create_workshop(data: WorkshopCreate, db: Session = Depends(get_db),
                    user: User = Depends(manager_only)):
    code = data.code.strip().upper()
    w = Workshop(code=code, title=data.title, instructor=data.instructor,
                 location=data.location, description=data.description,
                 starts_at=utc_naive(data.starts_at), capacity=data.capacity,
                 created_by=user.id)
    db.add(w)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A workshop with this code already exists")
    audit.log(db, user.id, "workshop.create", "workshop", w.id,
              f"{code} '{data.title}' capacity {data.capacity}")
    db.commit()
    return workshop_out(w, 0)

@router.patch("/{workshop_id}")
def update_workshop(workshop_id: int, data: WorkshopUpdate,
                    db: Session = Depends(get_db),
                    user: User = Depends(manager_only)):
    w, active = load(db, workshop_id)
    changes = data.model_dump(exclude_unset=True)
    if changes.get("starts_at"):
        changes["starts_at"] = utc_naive(changes["starts_at"])
    if changes.get("capacity") is not None and changes["capacity"] < active:
        raise HTTPException(409, f"Capacity cannot be lower than the {active} active registrations")
    notes = []
    for field, value in changes.items():
        if value is None:
            continue
        old = getattr(w, field)
        if old != value:
            notes.append(f"{field}: {old} -> {value}")
            setattr(w, field, value)
    if notes:
        audit.log(db, user.id, "workshop.update", "workshop", w.id, "; ".join(notes))
    db.commit()
    w, active = load(db, workshop_id)
    return workshop_out(w, active)

# ---------- registrations ----------
@router.get("/{workshop_id}/registrations")
def list_registrations(workshop_id: int,
                       status: Optional[Literal["active", "cancelled"]] = None,
                       db: Session = Depends(get_db),
                       user: User = Depends(view_roles)):
    load(db, workshop_id)
    q = db.query(Registration).filter(Registration.workshop_id == workshop_id)
    if status:
        q = q.filter(Registration.status == status)
    names = user_names(db)
    return [reg_out(r, names) for r in q.order_by(Registration.registered_at).all()]

@router.post("/{workshop_id}/registrations", status_code=201)
def register(workshop_id: int, data: RegisterRequest,
             db: Session = Depends(get_db), user: User = Depends(view_roles)):
    w, _ = load(db, workshop_id)
    if w.status != "scheduled":
        raise HTTPException(409, "This workshop is not open for registration")
    if w.starts_at <= utc_now_naive():
        raise HTTPException(409, "This workshop has already started")

    # THE CAPACITY RULE: check and insert happen in ONE atomic SQL statement.
    # The row is inserted only if active registrations < capacity.
    try:
        result = db.execute(text("""
            INSERT INTO registrations
                (workshop_id, attendee_name, attendee_email, status, registered_by, registered_at)
            SELECT :wid, :name, :email, 'active', :uid, :now
            WHERE (SELECT COUNT(*) FROM registrations
                   WHERE workshop_id = :wid AND status = 'active')
                < (SELECT capacity FROM workshops
                   WHERE id = :wid AND status = 'scheduled')
        """), {"wid": workshop_id, "name": data.attendee_name.strip(),
               "email": data.attendee_email.lower(), "uid": user.id,
               "now": utc_now_naive().strftime("%Y-%m-%d %H:%M:%S.%f")})
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "This person is already registered for this workshop")
    if result.rowcount == 0:
        raise HTTPException(409, "Workshop is full")
    reg = db.get(Registration, result.lastrowid)
    return reg_out(reg, user_names(db))

@router.post("/{workshop_id}/registrations/{reg_id}/cancel")
def cancel_registration(workshop_id: int, reg_id: int,
                        db: Session = Depends(get_db),
                        user: User = Depends(view_roles)):
    reg = db.get(Registration, reg_id)
    if not reg or reg.workshop_id != workshop_id:
        raise HTTPException(404, "Registration not found")
    # Atomic too: two people cancelling the same registration can't both succeed.
    result = db.execute(text("""
        UPDATE registrations
        SET status = 'cancelled', cancelled_by = :uid, cancelled_at = :now
        WHERE id = :id AND status = 'active'
    """), {"uid": user.id, "id": reg_id,
           "now": utc_now_naive().strftime("%Y-%m-%d %H:%M:%S.%f")})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(409, "This registration is already cancelled")
    db.refresh(reg)
    return reg_out(reg, user_names(db))