from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from database import get_db
from models import User
from auth import hash_password, require_roles
import audit

router = APIRouter(prefix="/users", tags=["users"])
Role = Literal["admin", "manager", "staff"]

class UserCreate(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)
    role: Role

class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    role: Optional[Role] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=8)

def to_out(u: User):
    return {"id": u.id, "name": u.name, "email": u.email,
            "role": u.role, "is_active": u.is_active}

@router.get("")
def list_users(db: Session = Depends(get_db),
               admin: User = Depends(require_roles("admin"))):
    return [to_out(u) for u in db.query(User).order_by(User.id).all()]

@router.post("", status_code=201)
def create_user(data: UserCreate, db: Session = Depends(get_db),
                admin: User = Depends(require_roles("admin"))):
    email = data.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "A user with this email already exists")
    user = User(name=data.name, email=email,
                password_hash=hash_password(data.password), role=data.role)
    db.add(user)
    db.flush()  # assigns user.id
    audit.log(db, admin.id, "user.create", "user", user.id,
              f"{email} created as {data.role}")
    db.commit()
    return to_out(user)

@router.patch("/{user_id}")
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db),
                admin: User = Depends(require_roles("admin"))):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == admin.id and (
        (data.role is not None and data.role != "admin") or data.is_active is False
    ):
        raise HTTPException(400, "You cannot demote or disable your own account")

    changes = []
    if data.name is not None and data.name != user.name:
        changes.append(f"name: {user.name} -> {data.name}")
        user.name = data.name
    if data.role is not None and data.role != user.role:
        changes.append(f"role: {user.role} -> {data.role}")
        user.role = data.role
    if data.is_active is not None and data.is_active != user.is_active:
        changes.append(f"is_active: {user.is_active} -> {data.is_active}")
        user.is_active = data.is_active
    if data.password is not None:
        user.password_hash = hash_password(data.password)
        changes.append("password reset")

    if changes:
        audit.log(db, admin.id, "user.update", "user", user.id, "; ".join(changes))
    db.commit()
    return to_out(user)