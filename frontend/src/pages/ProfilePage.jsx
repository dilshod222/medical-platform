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

import {
  notifications,
} from '@mantine/notifications';

import api from '../api/client';

import {
  clearTokens,
} from '../auth/tokenStorage';

import {
  getApiErrorMessage,
} from '../utils/apiError';


function ProfilePage() {
  const navigate = useNavigate();

  const {
    user,
    refreshUser,
  } = useOutletContext();

  const [
    profileLoading,
    setProfileLoading,
  ] = useState(false);

  const [
    passwordLoading,
    setPasswordLoading,
  ] = useState(false);

  const [
    showPasswords,
    setShowPasswords,
  ] = useState(false);


  const [
    profileForm,
    setProfileForm,
  ] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });


  const [
    passwordForm,
    setPasswordForm,
  ] = useState({
    new_password: '',
    new_password_confirm: '',
  });


  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileForm({
      first_name:
        user.first_name || '',

      last_name:
        user.last_name || '',

      email:
        user.email || '',

      phone:
        user.phone || '',
    });
  }, [user]);


  function handleProfileChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setProfileForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }


  function handlePasswordChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setPasswordForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }


  async function saveProfile(
    event
  ) {
    event.preventDefault();

    setProfileLoading(true);

    try {
      await api.patch(
        '/users/me/',
        profileForm
      );

      await refreshUser();

      notifications.show({
        title: 'Saqlandi',

        message:
          'Ism, familiya, email va '
          + 'telefon ma’lumotlaringiz '
          + 'yangilandi.',

        color: 'green',
      });

    } catch (error) {
      notifications.show({
        title:
          'O‘zgarishlarni saqlab '
          + 'bo‘lmadi',

        message:
          getApiErrorMessage(
            error
          ),

        color: 'red',
      });

    } finally {
      setProfileLoading(false);
    }
  }


  async function savePassword(
    event
  ) {
    event.preventDefault();

    if (
      !passwordForm.new_password
      || !passwordForm
        .new_password_confirm
    ) {
      notifications.show({
        title:
          'Parolni kiriting',

        message:
          'Yangi parolni ikki '
          + 'marta kiriting.',

        color: 'red',
      });

      return;
    }


    if (
      passwordForm.new_password
      !==
      passwordForm
        .new_password_confirm
    ) {
      notifications.show({
        title:
          'Parollar mos emas',

        message:
          'Ikkala maydonga bir '
          + 'xil parol kiriting.',

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
        title:
          'Parol yangilandi',

        message:
          'Yangi parol bilan '
          + 'qayta kiring.',

        color: 'green',
      });


      setPasswordForm({
        new_password: '',
        new_password_confirm: '',
      });


      window.setTimeout(
        () => {
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
        },
        900
      );

    } catch (error) {
      notifications.show({
        title:
          'Parolni o‘zgartirib '
          + 'bo‘lmadi',

        message:
          getApiErrorMessage(
            error
          ),

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
          setShowPasswords(
            (current) => !current
          );
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
        {
          showPasswords
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
            {
              user.first_name
              || 'foydalanuvchi'
            }
          </h1>

          <p>
            Shaxsiy ma’lumotlaringiz
            va parolingizni shu
            sahifada boshqaring.
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
              Ma’lumotlaringiz hali
              to‘liq kiritilmagan
            </strong>

            <span>
              Ism, familiya, email
              va telefon ma’lumotlarini
              to‘ldiring.
            </span>
          </div>

        </div>
      )}


      {user.profile_complete && (
        <div className="profile-success">
          <CheckCircle2 size={20} />

          Registratsiya ma’lumotlari
          to‘liq.
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

            <h2>
              Shaxsiy ma’lumotlar
            </h2>
          </div>

          <div className="role-chip">
            <ShieldCheck size={15} />
            {user.role_display}
          </div>

        </div>


        <div className="profile-grid">

          <div className="dashboard-field">
            <label>
              Ism
            </label>

            <div className="dashboard-input-shell">
              <UserRound size={18} />

              <input
                name="first_name"
                value={
                  profileForm.first_name
                }
                onChange={
                  handleProfileChange
                }
                placeholder="Ismingiz"
                autoComplete="given-name"
              />
            </div>
          </div>


          <div className="dashboard-field">
            <label>
              Familiya
            </label>

            <div className="dashboard-input-shell">
              <UserRound size={18} />

              <input
                name="last_name"
                value={
                  profileForm.last_name
                }
                onChange={
                  handleProfileChange
                }
                placeholder="Familiyangiz"
                autoComplete="family-name"
              />
            </div>
          </div>


          <div className="dashboard-field">
            <label>
              Email
            </label>

            <div className="dashboard-input-shell">
              <Mail size={18} />

              <input
                name="email"
                type="email"
                value={
                  profileForm.email
                }
                onChange={
                  handleProfileChange
                }
                placeholder="email@example.com"
                autoComplete="email"
              />
            </div>
          </div>


          <div className="dashboard-field">
            <label>
              Telefon
            </label>

            <div className="dashboard-input-shell">
              <Phone size={18} />

              <input
                name="phone"
                type="tel"
                value={
                  profileForm.phone
                }
                onChange={
                  handleProfileChange
                }
                placeholder="+998 90 123 45 67"
                autoComplete="tel"
              />
            </div>
          </div>

        </div>


        <div className="form-actions">

          <button
            className={
              'primary-dashboard-button'
            }
            type="submit"
            disabled={profileLoading}
          >
            <Save size={18} />

            {
              profileLoading
                ? 'Saqlanmoqda...'
                : 'O‘zgarishlarni saqlash'
            }
          </button>

        </div>

      </form>


      <section className="content-card">

        <div
          style={{
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              margin: 0,
            }}
          >
            Parolni o‘zgartirish
          </h2>

          <p
            style={{
              margin: '10px 0 0',
            }}
          >
            Yangi parolni ikki marta
            bir xil kiriting. Tizim
            ikkala qiymat bir xil
            ekanini tekshiradi. Parol
            yangilangach yangi parol
            bilan qayta kirasiz.
          </p>
        </div>


        <form
          onSubmit={savePassword}
        >

          <div className="profile-grid">

            <div className="dashboard-field">
              <label>
                Yangi parol
              </label>

              <div className="dashboard-input-shell">
                <KeyRound size={18} />

                <input
                  name="new_password"
                  type={
                    showPasswords
                      ? 'text'
                      : 'password'
                  }
                  value={
                    passwordForm
                      .new_password
                  }
                  onChange={
                    handlePasswordChange
                  }
                  placeholder={
                    'Yangi parolni kiriting'
                  }
                  autoComplete={
                    'new-password'
                  }
                />

                {
                  passwordToggleButton()
                }
              </div>
            </div>


            <div className="dashboard-field">
              <label>
                Yangi parolni
                takrorlang
              </label>

              <div className="dashboard-input-shell">
                <KeyRound size={18} />

                <input
                  name={
                    'new_password_confirm'
                  }
                  type={
                    showPasswords
                      ? 'text'
                      : 'password'
                  }
                  value={
                    passwordForm
                      .new_password_confirm
                  }
                  onChange={
                    handlePasswordChange
                  }
                  placeholder={
                    'Yangi parolni '
                    + 'qayta kiriting'
                  }
                  autoComplete={
                    'new-password'
                  }
                />

                {
                  passwordToggleButton()
                }
              </div>
            </div>

          </div>


          <div className="form-actions">

            <button
              className={
                'primary-dashboard-button'
              }
              type="submit"
              disabled={passwordLoading}
            >
              <KeyRound size={18} />

              {
                passwordLoading
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
