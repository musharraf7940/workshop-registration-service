# Workshop Registration Service

Full stack app for a community training centre: staff register attendees for workshops, managers schedule workshops, admins manage accounts. A workshop can never hold more active registrations than its capacity, even when requests arrive at the same moment.

**Stack:** FastAPI + SQLAlchemy + SQLite (backend), React + Vite (frontend).

## Run it locally

You need Python 3.10+ and Node 18+.

### Backend (terminal 1)

```powershell
cd backend
python -m venv venv
venv\Scripts\activate          # Mac/Linux: source venv/bin/activate
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

API runs at http://127.0.0.1:8000 and interactive docs at http://127.0.0.1:8000/docs.
The database (`workshops.db`) is created on first start, with the seed users and sample workshops below.

### Frontend (terminal 2)

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Seeded logins (development only)

| Role | Email | Password |
|---|---|---|
| Admin | admin@centre.test | Admin123! |
| Manager | manager@centre.test | Manager123! |
| Staff | staff@centre.test | Staff123! |

Sample workshops include `POT-102` (2 seats) and `FIT-110` (5 seats), which are easy to fill for testing.
To reset all data, stop the server, delete `backend/workshops.db`, and start it again.

## Permissions (enforced in the backend)

| Action | Admin | Manager | Staff |
|---|---|---|---|
| Create users, set roles, disable accounts | Yes | No | No |
| Add and edit workshops | No | Yes | No |
| Register and cancel attendees | No | Yes | Yes |
| View workshops, registrations, history | No | Yes | Yes |

## Proving the capacity rule

With the backend running, from the `backend` folder:

```powershell
python test_concurrency.py
```

It creates a 5-seat workshop and fires 30 simultaneous registrations. Expected: exactly 5 succeed, 25 are refused with `409 Workshop is full`, and the script prints `PASS`.

## Main endpoints

| Method | Path | Who |
|---|---|---|
| POST | /login | anyone |
| GET, POST, PATCH | /users | admin |
| GET | /workshops?from=&to=&status=&has_seats= | manager, staff |
| POST, PATCH | /workshops | manager |
| GET, POST | /workshops/{id}/registrations | manager, staff |
| POST | /workshops/{id}/registrations/{reg_id}/cancel | manager, staff |

See DESIGN.md for design decisions, trade-offs, and what was skipped.