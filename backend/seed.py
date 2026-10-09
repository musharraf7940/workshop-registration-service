from datetime import datetime, timedelta, timezone
from database import SessionLocal
from models import User, Workshop
from auth import hash_password

def run():
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return
        admin = User(name="Admin", email="admin@centre.test",
                     password_hash=hash_password("Admin123!"), role="admin")
        manager = User(name="Maya Manager", email="manager@centre.test",
                       password_hash=hash_password("Manager123!"), role="manager")
        staff = User(name="Sam Staff", email="staff@centre.test",
                     password_hash=hash_password("Staff123!"), role="staff")
        db.add_all([admin, manager, staff])
        db.flush()

        base = datetime.now(timezone.utc).replace(hour=10, minute=0, second=0, microsecond=0)
        samples = [
            ("POT-101", "Beginner Pottery", "Anna Perera", "Dehiwala Centre", 1, 12),
            ("COD-201", "Intro to Python", "Ravi Kumar", "Colombo Centre", 2, 20),
            ("FIT-110", "Morning Fitness", "Nimal Silva", "Kandy Centre", 3, 5),
            ("POT-102", "Advanced Pottery", "Anna Perera", "Dehiwala Centre", 5, 2),
            ("COD-301", "Web Basics", "Ravi Kumar", "Colombo Centre", 8, 15),
        ]
        for code, title, instructor, location, days, cap in samples:
            db.add(Workshop(code=code, title=title, instructor=instructor,
                            location=location, starts_at=base + timedelta(days=days),
                            capacity=cap, created_by=manager.id))
        db.commit()
    finally:
        db.close()