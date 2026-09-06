import {
  useEffect,
  useState,
} from 'react';

import { useOutletContext } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  HeartPulse,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { notifications } from '@mantine/notifications';

import api from '../api/client';


function ProfilePage() {
  const {
    user,
    refreshUser,
  } = useOutletContext();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
    });
  }, [user]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setLoading(true);

    try {
      await api.patch('/users/me/', form);
      await refreshUser();

      notifications.show({
        title: 'Saqlandi',
        message: 'Registratsiya ma’lumotlaringiz yangilandi.',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Xatolik',
        message: 'Ma’lumotlarni saqlab bo‘lmadi.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
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
            Registratsiya vaqtida kiritilgan shaxsiy
            ma’lumotlaringizni shu sahifada boshqaring.
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
                value={form.first_name}
                onChange={handleChange}
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
                value={form.last_name}
                onChange={handleChange}
                placeholder="Familiyangiz"
              />
            </div>
          </div>

          <div className="dashboard-field">
            <label>Email</label>
            <div className="dashboard-input-shell dashboard-input-disabled">
              <Mail size={18} />
              <input
                value={user.email}
                disabled
              />
            </div>
          </div>

          <div className="dashboard-field">
            <label>Telefon</label>
            <div className="dashboard-input-shell">
              <Phone size={18} />
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+998 90 123 45 67"
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            className="primary-dashboard-button"
            type="submit"
            disabled={loading}
          >
            <Save size={18} />
            {loading
              ? 'Saqlanmoqda...'
              : 'Ma’lumotlarni saqlash'
            }
          </button>
        </div>
      </form>
    </div>
  );
}


export default ProfilePage;
