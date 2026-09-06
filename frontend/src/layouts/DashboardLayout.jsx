import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  Bell,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  LogOut,
  Menu,
  MessageSquareText,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UsersRound,
  UserCog,
  X,
} from 'lucide-react';

import api from '../api/client';
import { clearTokens } from '../auth/tokenStorage';
import '../styles/dashboard.css';


function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  async function loadUser() {
    try {
      const response = await api.get('/users/me/');
      setUser(response.data);
    } catch {
      clearTokens();
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  }

  async function loadUnreadMessages() {
    try {
      const response = await api.get('/chat/unread-count/');
      setUnreadMessages(response.data?.unread_count || 0);
    } catch {
      setUnreadMessages(0);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    loadUnreadMessages();

    const interval = setInterval(
      loadUnreadMessages,
      8000
    );

    return () => clearInterval(interval);
  }, [user?.id, location.pathname]);

  useEffect(() => {
    window.addEventListener(
      'chat-unread-changed',
      loadUnreadMessages
    );

    return () => {
      window.removeEventListener(
        'chat-unread-changed',
        loadUnreadMessages
      );
    };
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const menuItems = useMemo(() => {
    if (!user) {
      return [];
    }

    const items = [
      {
        label: 'Ma’lumotlarim',
        path: '/dashboard',
        icon: UserRound,
        end: true,
      },
    ];

    if (
      user.role === 'PATIENT'
      || user.role === 'DOCTOR'
      || user.role === 'SUPERADMIN'
    ) {
      items.push({
        label: 'Kasallik haqida',
        path: '/dashboard/medical',
        icon: Stethoscope,
      });
    }

    items.push({
      label: 'Xabarlar',
      path: '/dashboard/messages',
      icon: MessageSquareText,
      badge: unreadMessages,
    });


    if (
      (
        user.role === 'DOCTOR'
        && user.doctor_type
      )
      || user.role === 'SUPERADMIN'
    ) {
      items.push({
        label: 'Bemorlar',
        path: '/dashboard/patients',
        icon: UsersRound,
      });
    }

    if (
      user.role === 'ADMIN'
      || user.role === 'SUPERADMIN'
    ) {
      items.push({
        label: 'Foydalanuvchilar',
        path: '/dashboard/users',
        icon: UserCog,
      });
    }

    if (user.role === 'SUPERADMIN') {
      items.push({
        label: 'Doktor turlari',
        path: '/dashboard/doctor-types',
        icon: Stethoscope,
      });

      items.push({
        label: 'Savollar',
        path: '/dashboard/questions',
        icon: ClipboardList,
      });
    }

    return items;
  }, [user, unreadMessages]);

  const pageTitle = useMemo(() => {
    if (location.pathname === '/dashboard') {
      return 'Ma’lumotlarim';
    }

    if (location.pathname.includes('/medical')) {
      return 'Kasallik haqida';
    }


    if (location.pathname.includes('/messages')) {
      return 'Xabarlar';
    }

    if (location.pathname.includes('/patients')) {
      return 'Bemorlar';
    }

    if (location.pathname.includes('/doctor-types')) {
      return 'Doktor turlari';
    }

    if (location.pathname.includes('/questions')) {
      return 'Savollar';
    }

    if (location.pathname.includes('/users')) {
      return 'Foydalanuvchilar';
    }

    return 'Ish maydoni';
  }, [location.pathname]);

  function logout() {
  clearTokens();

  localStorage.removeItem(
    'medconnect_last_activity'
  );

  navigate(
    '/login',
    {
      replace: true,
    }
  );
}

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loader-logo">
          <HeartPulse size={28} />
        </div>
        <div className="dashboard-loader-line" />
      </div>
    );
  }

  const initials = (
    `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`
  ).toUpperCase() || 'U';

  return (
    <div className="dashboard-shell">
      <header className="dashboard-topbar">
        <div className="topbar-left">
          <button
            className="mobile-menu-button"
            onClick={() => setSidebarOpen(true)}
            type="button"
            aria-label="Menyuni ochish"
          >
            <Menu size={21} />
          </button>

          <Link
            to="/dashboard"
            className="dashboard-brand"
          >
            <div className="dashboard-brand-logo">
              <HeartPulse size={24} />
            </div>

            <div>
              <strong>MedConnect</strong>
              <span>Medical Platform</span>
            </div>
          </Link>
        </div>

        <div className="topbar-right">
          <button
            className="topbar-icon-button"
            type="button"
            aria-label="Bildirishnomalar"
          >
            <Bell size={18} />
          </button>

          <div className="topbar-role">
            <ShieldCheck size={15} />
            {user.role_display}

            {user.doctor_type && (
              <span>{user.doctor_type.name}</span>
            )}
          </div>

          <div className="topbar-user">
            <div className="topbar-avatar">
              {initials}
            </div>

            <div className="topbar-user-info">
              <strong>
                {user.first_name || 'Foydalanuvchi'}{' '}
                {user.last_name || ''}
              </strong>
              <span>{user.email}</span>
            </div>
          </div>
        </div>
      </header>

      <aside
        className={
          `dashboard-sidebar ${
            sidebarOpen ? 'dashboard-sidebar-open' : ''
          }`
        }
      >
        <div className="sidebar-mobile-head">
          <span>Menyu</span>
          <button
            onClick={() => setSidebarOpen(false)}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-label">
          ASOSIY MENYU
        </div>

        <nav className="sidebar-navigation">
          {menuItems.map(({
            label,
            path,
            icon: Icon,
            end,
            badge,
          }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `sidebar-link ${
                  isActive ? 'sidebar-link-active' : ''
                }`
              }
            >
              <span className="sidebar-link-icon">
                <Icon size={19} />
              </span>
              <span>{label}</span>

              {badge > 0 && (
                <span className="sidebar-link-badge">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}

              <ChevronRight
                size={16}
                className="sidebar-arrow"
              />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-logout"
            onClick={logout}
            type="button"
          >
            <LogOut size={18} />
            Tizimdan chiqish
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="dashboard-main">
        <div className="dashboard-breadcrumb">
          Ish maydoni
          <ChevronRight size={13} />
          <strong>{pageTitle}</strong>
        </div>

        <Outlet
          context={{
            user,
            setUser,
            refreshUser: loadUser,
          }}
        />
      </main>
    </div>
  );
}


export default DashboardLayout;
