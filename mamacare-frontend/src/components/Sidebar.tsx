import { type Dispatch, type SetStateAction } from 'react';
import { LogoMark } from './Logo';

export type Section =
  | 'dashboard'
  | 'journey'
  | 'insights'
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
  partner: ['dashboard', 'journey', 'insights', 'centers', 'doctors', 'emergency', 'community', 'messages'],
  family: ['dashboard', 'journey', 'community', 'messages', 'emergency'],
  doctor: ['dashboard', 'insights', 'centers', 'doctors', 'messages', 'emergency'],
  admin: ['dashboard', 'settings'],
};

function Sidebar({
  activeSection,
  onSelectSection,
  role,
}: {
  activeSection: Section;
  onSelectSection: Dispatch<SetStateAction<Section>>;
  role: Role;
}) {
  const allowedSections = rolePermissions[role];

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sb-brand">
        <LogoMark size={30} />
        <div className="sb-brand-text">
          <div className="name">MamaCare <span>AI</span></div>
          <div className="tag">AI-POWERED · HUMAN-BACKED</div>
        </div>
      </div>

      <nav className="sb-nav">
        {menuItems.map((item) => {
          const allowed = allowedSections.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className={`sb-item ${activeSection === item.id ? 'active' : ''} ${!allowed ? 'locked' : ''}`}
              onClick={() => {
                if (!allowed) return;
                onSelectSection(item.id);
              }}
              data-section={item.id}
            >
              <span className="sb-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
