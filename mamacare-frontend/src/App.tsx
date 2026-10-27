import { useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { Role } from './services/api';
import Sidebar, { type Section } from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Journey from './pages/Journey';
import Insights from './pages/Insights';
import Centers from './pages/Centers';
import Doctors from './pages/Doctors';
import Fund from './pages/Fund';
import Emergency from './pages/Emergency';
import Community from './pages/Community';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import AuthPage from './pages/auth/AuthPage';
import ChatForms from './pages/ChatForms';


const roleLabels: Record<Role, string> = {
  mother: 'Mother',
  partner: 'Partner',
  family: 'Family member',
  doctor: 'Doctor',
  admin: 'Administrator',
};

function MainApp() {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const role: Role = user?.role ?? 'mother';

  const currentTitle = useMemo(() => {
    switch (activeSection) {
      case 'dashboard': return 'Dashboard';
      case 'journey': return 'Pregnancy Journey';
      case 'insights': return 'Health Insights';
      case 'centers': return 'Health Centers';
      case 'doctors': return 'Doctors & Chat';
      case 'chat': return 'Ask Vera';
      case 'fund': return 'Mama Fund';
      case 'emergency': return 'Emergency';
      case 'community': return 'Community';
      case 'messages': return 'Messages';
      case 'settings': return 'Settings';
      default: return 'MamaCare AI';
    }
  }, [activeSection]);

  return (
    <div className="app">
      <Sidebar activeSection={activeSection} onSelectSection={setActiveSection} role={role} />
      <div className="main">
        <Topbar
          title={currentTitle}
          roleLabel={roleLabels[role]}
          userName={user?.fullName ?? ''}
          onLogout={logout}
        />
        <main className="content">
          {activeSection === 'dashboard' && <Dashboard onNavigate={setActiveSection} />}
          {activeSection === 'journey' && <Journey onNavigate={setActiveSection} />}
          {activeSection === 'insights' && <Insights onNavigate={setActiveSection} />}
          {activeSection === 'centers' && <Centers />}
          {activeSection === 'doctors' && <Doctors />}
          {activeSection === 'chat' && <ChatForms />}
          {activeSection === 'fund' && <Fund />}
          {activeSection === 'emergency' && <Emergency />}
          {activeSection === 'community' && <Community />}
          {activeSection === 'messages' && <Messages />}
          {activeSection === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}

function AppRouter() {
  const { user } = useAuth();
  return user ? <MainApp /> : <AuthPage />;
}

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
