import { useState } from "react";
import Login from "./Login";
import Workshops from "./Workshops";
import WorkshopDetail from "./WorkshopDetail";
import Users from "./Users";
import { initials } from "./util";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
  const [page, setPage] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  function onLogin(token, u) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(u));
    setPage(null);
    setSelectedId(null);
    setUser(u);
  }

  function logout() {
    localStorage.clear();
    setUser(null);
    setPage(null);
    setSelectedId(null);
  }

  if (!user) return <Login onLogin={onLogin} />;

  // Admins have no access to workshops (per the brief), so they land on Users.
  const isAdmin = user.role === "admin";
  const current = page ?? (isAdmin ? "users" : "workshops");

  return (
    <div>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
            Workshop Registration
          </div>
          <nav className="topnav">
            {isAdmin ? (
              <button className={`navlink ${current === "users" ? "active" : ""}`} onClick={() => setPage("users")}>
                Users
              </button>
            ) : (
              <button
                className={`navlink ${current === "workshops" ? "active" : ""}`}
                onClick={() => { setPage("workshops"); setSelectedId(null); }}
              >
                Workshops
              </button>
            )}
          </nav>
          <div className="userchip">
            <span className="avatar">{initials(user.name)}</span>
            <span className="uname">{user.name}</span>
            <span className="tag role">{user.role}</span>
            <button className="link" onClick={logout}>Log out</button>
          </div>
        </div>
      </header>

      <main className="page">
        {current === "users" && isAdmin && <Users me={user} />}
        {current === "workshops" && !isAdmin && (
          selectedId ? (
            <WorkshopDetail id={selectedId} user={user} onBack={() => setSelectedId(null)} />
          ) : (
            <Workshops user={user} onOpen={setSelectedId} />
          )
        )}
      </main>
    </div>
  );
}