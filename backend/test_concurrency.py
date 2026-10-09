import random, string
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import requests

BASE = "http://127.0.0.1:8000"
CAPACITY, ATTEMPTS = 5, 30

def login(email, password):
    r = requests.post(f"{BASE}/login", json={"email": email, "password": password})
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['token']}"}

manager = login("manager@centre.test", "Manager123!")
staff = login("staff@centre.test", "Staff123!")

code = "TEST-" + "".join(random.choices(string.digits, k=5))
r = requests.post(f"{BASE}/workshops", headers=manager, json={
    "code": code, "title": "Concurrency test", "instructor": "Test", "location": "Test",
    "starts_at": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
    "capacity": CAPACITY})
r.raise_for_status()
wid = r.json()["id"]

def attempt(i):
    return requests.post(f"{BASE}/workshops/{wid}/registrations", headers=staff,
        json={"attendee_name": f"Person {i}", "attendee_email": f"person{i}@example.com"}).status_code

with ThreadPoolExecutor(max_workers=ATTEMPTS) as pool:
    codes = list(pool.map(attempt, range(ATTEMPTS)))

detail = requests.get(f"{BASE}/workshops/{wid}", headers=staff).json()
print(f"{ATTEMPTS} simultaneous attempts on a {CAPACITY}-seat workshop")
print(f"  succeeded (201): {codes.count(201)}")
print(f"  refused as full (409): {codes.count(409)}")
print(f"  other: {[c for c in codes if c not in (201, 409)]}")
print(f"  seats_taken in DB: {detail['seats_taken']}")
assert codes.count(201) == CAPACITY and detail["seats_taken"] == CAPACITY, "CAPACITY RULE BROKEN"
print("PASS: capacity rule holds under concurrent requests")