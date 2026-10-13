from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import Base, engine, get_db
from models import User
from auth import verify_password, create_token, get_current_user
from routers import users, workshops
import seed
import os

Base.metadata.create_all(bind=engine)
seed.run()

app = FastAPI(title="Workshop Registration Service")
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
     allow_origin_regex=r"https://workshop-registration-service[a-z0-9-]*\.vercel\.app"
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workshops.router)

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not user.is_active or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return {"token": create_token(user),
            "user": {"id": user.id, "name": user.name, "role": user.role}}

@app.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}