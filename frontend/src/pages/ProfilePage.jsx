import {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
  useOutletContext,
} from 'react-router-dom';

import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartPulse,
  KeyRound,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { notifications } from '@mantine/notifications';

import api from '../api/client';
import { clearTokens } from '../auth/tokenStorage';
import { getApiErrorMessage } from '../utils/apiError';


function ProfilePage() {
  const navigate = useNavigate();

  const {
    user,
    refreshUser,
  } = useOutletContext();

  const [profileLoading, setProfileLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
  });

  const [loginForm, setLoginForm] = useState({
    email: '',
    phone: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    new_password: '',
    new_password_confirm: '',
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
    });

    setLoginForm((current) => ({
      ...current,
      email: user.email || '',
      phone: user.phone || '',
    }));
  }, [user]);

  function handleProfileChange(event) {
    const { name, value } = event.target;

    setProfileForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleLoginChange(event) {
    const { name, value } = event.target;

    setLoginForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setProfileLoading(true);

    try {
      await api.patch('/users/me/', profileForm);
      await refreshUser();

      notifications.show({
        title: 'Saqlandi',
        message: 'Shaxsiy ma’lumotlaringiz yangilandi.',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Xatolik',
        message: getApiErrorMessage(error),
        color: 'red',
      });
    } finally {
      setProfileLoading(false);
    }
  }

  async function saveLoginCredentials(event) {
    event.preventDefault();
    setLoginLoading(true);

    try {
      await api.patch(
        '/users/me/login/',
        loginForm
      );

      await refreshUser();

      notifications.show({
        title: 'Login yangilandi',
        message: (
          'Email va telefon login ma’lumotlari muvaffaqiyatli yangilandi.'
        ),
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Loginni o‘zgartirib bo‘lmadi',
        message: getApiErrorMessage(error),
        color: 'red',
      });
    } finally {
      setLoginLoading(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();

    if (
      passwordForm.new_password
      !== passwordForm.new_password_confirm
    ) {
      notifications.show({
        title: 'Parollar mos emas',
        message: 'Yangi parolni ikki marta bir xil kiriting.',
        color: 'red',
      });
      return;
    }

    setPasswordLoading(true);

    try {
      await api.post(
        '/users/me/password/',
        passwordForm
      );

      notifications.show({
        title: 'Parol yangilandi',
        message: 'Endi yangi parol bilan qayta kiring.',
        color: 'green',
      });

      setPasswordForm({
        new_password: '',
        new_password_confirm: '',
      });

      window.setTimeout(() => {
        clearTokens();
        localStorage.removeItem(
          'medconnect_last_activity'
        );
        navigate('/login', { replace: true });
      }, 900);
    } catch (error) {
      notifications.show({
        title: 'Parolni o‘zgartirib bo‘lmadi',
        message: getApiErrorMessage(error),
        color: 'red',
      });
    } finally {
      setPasswordLoading(false);
    }
  }

  function passwordToggleButton() {
    return (
      <button
        type="button"
        onClick={() => {
          setShowPasswords((current) => !current);
        }}
        aria-label={
          showPasswords
            ? 'Parolni yashirish'
            : 'Parolni ko‘rsatish'
        }
        style={{
          border: 0,
          background: 'transparent',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'inherit',
        }}
      >
        {showPasswords
          ? <EyeOff size={18} />
          : <Eye size={18} />
        }
      </button>
    );
  }

  return (
    <div className="page-content">
      <section className="welcome-card">
        <div>
          <div className="page-kicker">
            SHAXSIY KABINET
          </div>

          <h1>
            Assalomu alaykum,{' '}
            {user.first_name || 'foydalanuvchi'}
          </h1>

          <p>
            Shaxsiy ma’lumotlaringiz, login va parolingizni
            shu sahifada boshqaring.
          </p>
        </div>

        <div className="welcome-icon">
          <HeartPulse size={30} />
        </div>
      </section>

      {!user.profile_complete && (
        <div className="profile-warning">
          <div className="warning-icon">
            <AlertCircle size={21} />
          </div>

          <div>
            <strong>
              Ma’lumotlaringiz hali to‘liq kiritilmagan
            </strong>
            <span>
              Ism, familiya va telefon ma’lumotlarini to‘ldiring.
            </span>
          </div>
        </div>
      )}

      {user.profile_complete && (
        <div className="profile-success">
          <CheckCircle2 size={20} />
          Registratsiya ma’lumotlari to‘liq.
        </div>
      )}

      <form
        className="content-card"
        onSubmit={saveProfile}
      >
        <div className="content-card-header">
          <div>
            <span className="card-kicker">
              MEN HAQIMDA
            </span>
            <h2>Shaxsiy ma’lumotlar</h2>
          </div>

          <div className="role-chip">
            <ShieldCheck size={15} />
            {user.role_display}
          </div>
        </div>

        <div className="profile-grid">
          <div className="dashboard-field">
            <label>Ism</label>
            <div className="dashboard-input-shell">
              <UserRound size={18} />
              <input
                name="first_name"
                value={profileForm.first_name}
                onChange={handleProfileChange}
                placeholder="Ismingiz"
              />
            </div>
          </div>

          <div className="dashboard-field">
            <label>Familiya</label>
            <div className="dashboard-input-shell">
              <UserRound size={18} />
              <input
                name="last_name"
                value={profileForm.last_name}
                onChange={handleProfileChange}
                placeholder="Familiyangiz"
              />
            </div>
          </div>

          <div className="dashboard-field">
            <label>Email</label>
            <div className="dashboard-input-shell dashboard-input-disabled">
              <Mail size={18} />
              <input
                value={user.email || ''}
                disabled
              />
            </div>
          </div>

          <div className="dashboard-field">
            <label>Telefon</label>
            <div className="dashboard-input-shell dashboard-input-disabled">
              <Phone size={18} />
              <input
                value={user.phone || ''}
                disabled
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            className="primary-dashboard-button"
            type="submit"
            disabled={profileLoading}
          >
            <Save size={18} />
            {profileLoading
              ? 'Saqlanmoqda...'
              : 'Ma’lumotlarni saqlash'
            }
          </button>
        </div>
      </form>

      <section className="content-card">


        <form onSubmit={savePassword}>
          <div style={{ marginBottom: 22 }}>
            <h3 style={{ margin: 0 }}>
              Parolni o‘zgartirish
            </h3>
            <p style={{ margin: '6px 0 0' }}>
              Yangi parolni ikki marta bir xil kiriting. Tizim ikkala qiymatni
              tekshiradi. Parol yangilangach yangi parol bilan qayta kirasiz.
            </p>
          </div>

          <div className="profile-grid">
            <div className="dashboard-field">
              <label>Yangi parol</label>
              <div className="dashboard-input-shell">
                <KeyRound size={18} />
                <input
                  name="new_password"
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordForm.new_password}
                  onChange={handlePasswordChange}
                  placeholder="Kamida 8 ta belgi"
                  autoComplete="new-password"
                />
                {passwordToggleButton()}
              </div>
            </div>

            <div className="dashboard-field">
              <label>Yangi parolni takrorlang</label>
              <div className="dashboard-input-shell">
                <KeyRound size={18} />
                <input
                  name="new_password_confirm"
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordForm.new_password_confirm}
                  onChange={handlePasswordChange}
                  placeholder="Yangi parolni qayta kiriting"
                  autoComplete="new-password"
                />
                {passwordToggleButton()}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              className="primary-dashboard-button"
              type="submit"
              disabled={passwordLoading}
            >
              <KeyRound size={18} />
              {passwordLoading
                ? 'Yangilanmoqda...'
                : 'Parolni yangilash'
              }
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}


export default ProfilePage;
