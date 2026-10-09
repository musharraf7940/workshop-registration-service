# Design notes

## Stack and why
- **FastAPI + SQLAlchemy:** fast to build, automatic request validation, and a free interactive docs page for testing.
- **SQLite:** one file, zero setup, so reviewers can run it immediately. Right-sized for ~15 staff.
- **React + Vite, no extra libraries:** the UI is small, so plain state and fetch keep it easy to read.
- **JWT auth with bcrypt-hashed passwords.**

## How over-registration is prevented
Registering is a **single atomic SQL statement**: `INSERT ... SELECT ... WHERE (active registrations) < capacity`. There is no separate "count, then insert" step, so two requests cannot both see "19 of 20" and both succeed. If zero rows are inserted, the API returns `409 Workshop is full`. SQLite serialises writers (WAL mode plus a busy timeout), so simultaneous requests queue rather than fail.
A partial unique index also stops the same email being actively registered twice for one workshop. Cancelling is atomic too, so two people cancelling the same registration cannot both succeed.
`test_concurrency.py` fires 30 parallel requests at a 5-seat workshop and confirms exactly 5 succeed.

## Design decisions
- **Permissions are enforced in the backend** by a reusable `require_roles(...)` dependency. The UI also hides buttons, but only for convenience.
- **The role is read from the database on every request**, not stored in the token, so role changes and account disabling take effect immediately.
- **Registrations are never deleted.** Cancelling sets `status`, `cancelled_by` and `cancelled_at`, so the full history stays available.
- **Extra workshop fields:** location (the centre has three sites) and a description.
- **Audit trail (bonus):** workshop creation and edits, and account and role changes, are written to an `audit_log` table recording who, what and when. Registration history lives in the registrations table itself.
- Seats available are computed from active registrations, never stored, so they cannot drift out of sync.

## Assumptions
- Admin cannot view workshops or register attendees, because the brief marks those "No" for Admin.
- Admins cannot demote or disable their own account, to avoid locking everyone out.
- Registration is closed for cancelled, completed or already-started workshops.
- Capacity cannot be lowered below the current number of active registrations.
- Times are stored in UTC and shown in the browser's local time.
- Emails are compared in lowercase.

## Trade-offs
- SQLite allows one writer at a time. That is fine for this load. On PostgreSQL I would lock the workshop row (`SELECT ... FOR UPDATE`) inside the registration transaction to keep the same guarantee.
- Simple JWT with no refresh tokens or password reset flow.

## Skipped
- Waitlist (bonus).
- Deployment.
- Pagination, and a screen for browsing the audit log.
- An automated test suite beyond the concurrency script.
- Production secrets handling: the JWT secret falls back to a dev value unless `SECRET_KEY` is set.