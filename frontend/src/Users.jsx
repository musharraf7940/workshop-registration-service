import { useEffect, useState } from "react";
import { api } from "./api";

export default function Users({ me }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" });

  async function load() {
    try { setUsers(await api("/users")); } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/users", { method: "POST", body: form });
      setForm({ name: "", email: "", password: "", role: "staff" });
    } catch (err) { setError(err.message); }
    load();
  }

  async function patch(u, changes) {
    setError("");
    try { await api(`/users/${u.id}`, { method: "PATCH", body: changes }); }
    catch (err) { setError(err.message); }
    load();
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <h2>User accounts</h2>
      <form className="card grid" onSubmit={create}>
        <label>Name<input value={form.name} onChange={set("name")} required /></label>
        <label>Email<input type="email" value={form.email} onChange={set("email")} required /></label>
        <label>Password (8+ characters)<input type="password" minLength="8" value={form.password} onChange={set("password")} required /></label>
        <label>Role
          <select value={form.role} onChange={set("role")}>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button className="wide">Create account</button>
      </form>

      {error && <p className="error">{error}</p>}

      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={u.is_active ? "" : "dim"}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <select value={u.role} disabled={u.id === me.id} onChange={(e) => patch(u, { role: e.target.value })}>
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td>
                <button className="link" disabled={u.id === me.id} onClick={() => patch(u, { is_active: !u.is_active })}>
                  {u.is_active ? "Disable" : "Enable"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}