import { useState } from 'react';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function Topbar({
  title,
  roleLabel,
  userName,
  onLogout,
  menuOpen,
  onMenu,
}: {
  title: string;
  roleLabel: string;
  userName: string;
  onLogout: () => void;
  menuOpen: boolean;
  onMenu: () => void;
}) {
  const [dropOpen, setDropOpen] = useState(false);

  return (
    <header className="topbar">
      <button
        type="button"
        className="menu-toggle"
        aria-label="Open menu"
        aria-controls="sidebar"
        aria-expanded={menuOpen}
        onClick={onMenu}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
        </svg>
      </button>
      <h1>{title}</h1>
      <div className="tb-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input type="text" placeholder="Search health tips, doctors, centers…" />
        <kbd>Ctrl K</kbd>
      </div>
      <div className="tb-right">
        <div className="icon-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" />
          </svg>
          <span className="badge">3</span>
        </div>

        <div className="profile-chip" onClick={() => setDropOpen((o) => !o)}>
          <div className="avatar">{initials(userName)}</div>
          <div className="profile-meta">
            <div className="pm-name">{userName}</div>
            <div className="pm-role">{roleLabel}</div>
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          {dropOpen && (
            <div className="profile-drop" onClick={(e) => e.stopPropagation()}>
              <button className="drop-item drop-item--danger" onClick={onLogout}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;

