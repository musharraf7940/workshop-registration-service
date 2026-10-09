export const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "");

// ISO string from the API -> value for <input type="datetime-local">
export function toLocalInput(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// datetime-local value -> UTC ISO string for the API
export const toIso = (local) => new Date(local).toISOString();


export function dateParts(iso) {
  const d = new Date(iso);
  return {
    day: d.getDate(),
    month: d.toLocaleString(undefined, { month: "short" }),
    weekday: d.toLocaleString(undefined, { weekday: "short" }),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

export const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join("");