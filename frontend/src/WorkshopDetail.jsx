import { useEffect, useState } from "react";
import { api } from "./api";
import { fmt, toLocalInput, toIso } from "./util";
import SeatMeter from "./SeatMeter";

export default function WorkshopDetail({ id, user, onBack }) {
  const [w, setW] = useState(null);
  const [regs, setRegs] = useState([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [person, setPerson] = useState({ attendee_name: "", attendee_email: "" });
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({});

  async function load() {
    try {
      const [workshop, registrations] = await Promise.all([
        api(`/workshops/${id}`),
        api(`/workshops/${id}/registrations`),
      ]);
      setW(workshop);
      setRegs(registrations);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function register(e) {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      await api(`/workshops/${id}/registrations`, { method: "POST", body: person });
      setMsg(`${person.attendee_name} is registered.`);
      setPerson({ attendee_name: "", attendee_email: "" });
    } catch (err) {
      setError(err.message);
    }
    load();
  }

  async function cancel(reg) {
    if (!window.confirm(`Cancel the registration for ${reg.attendee_name}?`)) return;
    setError(""); setMsg("");
    try {
      await api(`/workshops/${id}/registrations/${reg.id}/cancel`, { method: "POST" });
      setMsg(`Cancelled ${reg.attendee_name}. The seat is free again.`);
    } catch (err) {
      setError(err.message);
    }
    load();
  }

  function startEdit() {
    setEdit({
      title: w.title, instructor: w.instructor, location: w.location,
      description: w.description, starts_at: toLocalInput(w.starts_at),
      capacity: w.capacity, status: w.status,
    });
    setEditing(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      await api(`/workshops/${id}`, {
        method: "PATCH",
        body: { ...edit, capacity: Number(edit.capacity), starts_at: toIso(edit.starts_at) },
      });
      setEditing(false);
      setMsg("Workshop updated.");
    } catch (err) {
      setError(err.message);
    }
    load();
  }

  if (!w) {
    return (
      <div>
        <button className="link back" onClick={onBack}>&larr; Workshops</button>
        <p className={error ? "error" : "muted"}>{error || "Loading..."}</p>
      </div>
    );
  }

  const setE = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });
  const open = w.status === "scheduled";

  return (
    <div>
      <button className="link back" onClick={onBack}>&larr; Workshops</button>

      <div className="page-head">
        <div>
          <h1>
            {w.title} {!open && <span className={`tag ${w.status}`}>{w.status}</span>}
          </h1>
          <dl className="facts">
            <div><dt>When</dt><dd>{fmt(w.starts_at)}</dd></div>
            <div><dt>Instructor</dt><dd>{w.instructor}</dd></div>
            <div><dt>Location</dt><dd>{w.location}</dd></div>
            <div><dt>Code</dt><dd>{w.code}</dd></div>
          </dl>
          {w.description && <p style={{ marginTop: 12 }}>{w.description}</p>}
        </div>
        {user.role === "manager" && !editing && (
          <button className="secondary" onClick={startEdit}>Edit workshop</button>
        )}
      </div>

      {editing && (
        <form className="panel grid" onSubmit={saveEdit}>
          <h3 className="wide">Edit workshop</h3>
          <label>Title<input value={edit.title} onChange={setE("title")} required /></label>
          <label>Instructor<input value={edit.instructor} onChange={setE("instructor")} required /></label>
          <label>Location<input value={edit.location} onChange={setE("location")} required /></label>
          <label>Date and time<input type="datetime-local" value={edit.starts_at} onChange={setE("starts_at")} required /></label>
          <label>Seats<input type="number" min="1" value={edit.capacity} onChange={setE("capacity")} required /></label>
          <label>Status
            <select value={edit.status} onChange={setE("status")}>
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="wide">Description<input value={edit.description} onChange={setE("description")} /></label>
          <div className="wide row">
            <button>Save changes</button>
            <button type="button" className="link" onClick={() => setEditing(false)}>Discard</button>
          </div>
        </form>
      )}

      {error && <p className="error">{error}</p>}
      {msg && <p className="success">{msg}</p>}

      <div className="detail">
        <section>
          <h3 style={{ marginBottom: 10 }}>Registration history</h3>
          {regs.length === 0 ? (
            <div className="empty"><p>No one has registered yet.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Attendee</th><th>Status</th><th>Registered by</th><th>Cancelled by</th><th></th></tr>
                </thead>
                <tbody>
                  {regs.map((r) => (
                    <tr key={r.id} className={r.status === "cancelled" ? "dim" : ""}>
                      <td><span className="person">{r.attendee_name}</span><span className="muted">{r.attendee_email}</span></td>
                      <td><span className={`tag ${r.status}`}>{r.status}</span></td>
                      <td>{r.registered_by}<span className="muted">{fmt(r.registered_at)}</span></td>
                      <td>{r.cancelled_by ? <>{r.cancelled_by}<span className="muted">{fmt(r.cancelled_at)}</span></> : ""}</td>
                      <td>{r.status === "active" && <button className="link danger" onClick={() => cancel(r)}>Cancel</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="side">
          <div className="panel">
            <div className="big-count">
              <strong>{w.seats_available}</strong>
              <span>{w.seats_available === 1 ? "seat" : "seats"} left</span>
              <span className="muted">of {w.capacity}</span>
            </div>
            <SeatMeter taken={w.seats_taken} capacity={w.capacity} size="lg" hideLabel />

            {open ? (
              <form onSubmit={register}>
                <label>Attendee name
                  <input value={person.attendee_name} onChange={(e) => setPerson({ ...person, attendee_name: e.target.value })} required />
                </label>
                <label>Attendee email
                  <input type="email" value={person.attendee_email} onChange={(e) => setPerson({ ...person, attendee_email: e.target.value })} required />
                </label>
                <button disabled={w.seats_available === 0}>
                  {w.seats_available === 0 ? "Workshop is full" : "Register attendee"}
                </button>
              </form>
            ) : (
              <p className="muted" style={{ marginTop: 16 }}>Registration is closed because this workshop is {w.status}.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}