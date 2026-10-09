const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("token");
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }

  if (!res.ok) {
    // Expired or disabled account: send the user back to login
    if (res.status === 401 && token) {
      localStorage.clear();
      window.location.reload();
    }
    let msg = data?.detail ?? `Request failed (${res.status})`;
    if (Array.isArray(msg)) msg = msg.map((e) => `${e.loc.slice(1).join(".")}: ${e.msg}`).join("; ");
    throw new Error(msg);
  }
  return data;
}