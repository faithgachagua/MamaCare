import { type Dispatch, type SetStateAction } from 'react';
import { LogoMark } from './Logo';

export type Section =
  | 'dashboard'
  | 'journey'
  | 'insights'
  | 'circle'
  | 'baby'
  | 'centers'
  | 'doctors'
  | 'chat'
  | 'fund'
  | 'emergency'
  | 'community'
  | 'messages'
  | 'settings';

type Role = 'mother' | 'partner' | 'family' | 'doctor' | 'admin';

const menuItems: Array<{ id: Section; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'journey', label: 'Pregnancy Journey' },
  { id: 'insights', label: 'Health Insights' },
  { id: 'baby', label: 'Baby & vaccines' },
  { id: 'circle', label: 'My care circle' },
  { id: 'centers', label: 'Health Centers' },
  { id: 'doctors', label: 'Doctors & Chat' },
  { id: 'chat', label: 'Ask Vera' },
  { id: 'fund', label: 'Mama Fund' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'community', label: 'Community' },
  { id: 'messages', label: 'Messages' },
  { id: 'settings', label: 'Settings' },
];

const rolePermissions: Record<Role, Section[]> = {
  mother: menuItems.map((item) => item.id),
  // Everyone but the mother sees what mothers have shared with them, on the dashboard.
  partner: ['dashboard', 'emergency', 'settings'],
  family: ['dashboard', 'emergency', 'settings'],
  doctor: ['dashboard', 'emergency', 'settings'],
  admin: ['settings'],
};

function Sidebar({
  activeSection,
  onSelectSection,
  role,
  open,
  onClose,
}: {
  activeSection: Section;
  onSelectSection: Dispatch<SetStateAction<Section>>;
  role: Role;
  open: boolean;
  onClose: () => void;
}) {
  const allowedSections = rolePermissions[role];

  return (
    <>
    <div className={`scrim ${open ? 'show' : ''}`} onClick={onClose} aria-hidden="true" />
    <aside className={`sidebar ${open ? 'open' : ''}`} id="sidebar" aria-label="Main menu">
      <div className="sb-brand">
        <LogoMark size={30} />
        <div className="sb-brand-text">
          <div className="name">MamaCare <span>AI</span></div>
          <div className="tag">AI-POWERED · HUMAN-BACKED</div>
        </div>
      </div>

      <nav className="sb-nav">
        {menuItems.filter((item) => allowedSections.includes(item.id)).map((item) => {
          const allowed = true;
          return (
            <button
              key={item.id}
              type="button"
              className={`sb-item ${activeSection === item.id ? 'active' : ''} ${!allowed ? 'locked' : ''}`}
              onClick={() => {
                if (!allowed) return;
                onSelectSection(item.id);
                onClose();
              }}
              data-section={item.id}
            >
              <span className="sb-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
    </>
  );
}

export default Sidebar;
