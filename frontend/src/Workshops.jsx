import { useEffect, useState } from "react";
import { api } from "./api";
import { toIso, dateParts } from "./util";
import SeatMeter from "./SeatMeter";

const emptyForm = { code: "", title: "", instructor: "", location: "", description: "", starts_at: "", capacity: 10 };
const noFilters = { from: "", to: "", status: "", hasSeats: false };

export default function Workshops({ user, onOpen }) {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState(noFilters);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const hasFilters = JSON.stringify(filters) !== JSON.stringify(noFilters);

  async function load() {
    setLoading(true);
    setError("");
    const p = new URLSearchParams();
    if (filters.from) p.set("from", `${filters.from}T00:00:00`);
    if (filters.to) p.set("to", `${filters.to}T23:59:59`);
    if (filters.status) p.set("status", filters.status);
    if (filters.hasSeats) p.set("has_seats", "true");
    try {
      setItems(await api(`/workshops?${p}`));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filters]);

  async function create(e) {
    e.preventDefault();
    setFormError("");
    try {
      await api("/workshops", {
        method: "POST",
        body: { ...form, capacity: Number(form.capacity), starts_at: toIso(form.starts_at) },
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setF = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Workshops</h1>
          <p className="muted">
            {loading ? "Loading..." : `${items.length} ${items.length === 1 ? "workshop" : "workshops"}`}
          </p>
        </div>
        {user.role === "manager" && (
          <button onClick={() => setShowForm(!showForm)}>{showForm ? "Close form" : "New workshop"}</button>
        )}
      </div>

      {showForm && (
        <form className="panel grid" onSubmit={create}>
          <h3 className="wide">New workshop</h3>
          <label>Code<input value={form.code} onChange={set("code")} required /></label>
          <label>Title<input value={form.title} onChange={set("title")} required /></label>
          <label>Instructor<input value={form.instructor} onChange={set("instructor")} required /></label>
          <label>Location<input value={form.location} onChange={set("location")} required /></label>
          <label>Date and time<input type="datetime-local" value={form.starts_at} onChange={set("starts_at")} required /></label>
          <label>Seats<input type="number" min="1" value={form.capacity} onChange={set("capacity")} required /></label>
          <label className="wide">Description<input value={form.description} onChange={set("description")} /></label>
          {formError && <p className="error wide">{formError}</p>}
          <div className="wide"><button>Create workshop</button></div>
        </form>
      )}

      <div className="toolbar">
        <label>From<input type="date" value={filters.from} onChange={setF("from")} /></label>
        <label>To<input type="date" value={filters.to} onChange={setF("to")} /></label>
        <label>Status
          <select value={filters.status} onChange={setF("status")}>
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label className="switch">
          <input type="checkbox" checked={filters.hasSeats} onChange={(e) => setFilters({ ...filters, hasSeats: e.target.checked })} />
          Only workshops with free seats
        </label>
        {hasFilters && <button className="link" onClick={() => setFilters(noFilters)}>Clear filters</button>}
      </div>

      {error && <p className="error">{error}</p>}

      {loading && items.length === 0 && (
        <div className="ws-list"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="empty">
          <p>No workshops match these filters.</p>
          {hasFilters && <button className="secondary" onClick={() => setFilters(noFilters)}>Clear filters</button>}
        </div>
      )}

      {items.length > 0 && (
        <div className="ws-list">
          {items.map((w) => {
            const d = dateParts(w.starts_at);
            return (
              <button key={w.id} className="ws-row" onClick={() => onOpen(w.id)}>
                <span className="ws-date">
                  <span className="ws-month">{d.month}</span>
                  <span className="ws-day">{d.day}</span>
                </span>
                <span className="ws-main">
                  <span className="ws-title">
                    {w.title}
                    {w.status !== "scheduled" && <span className={`tag ${w.status}`}>{w.status}</span>}
                  </span>
                  <span className="ws-sub">
                    <span>{d.weekday} {d.time}</span>
                    <span>{w.instructor}</span>
                    <span>{w.location}</span>
                  </span>
                </span>
                <span className="ws-code">{w.code}</span>
                <SeatMeter taken={w.seats_taken} capacity={w.capacity} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}