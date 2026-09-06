import { useEffect, useState } from 'react';

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import AuthLayout from '../components/AuthLayout';
import api from '../api/client';
import {
  clearTokens,
  saveTokens,
} from '../auth/tokenStorage';
import { getApiErrorMessage } from '../utils/apiError';


function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    login: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(
    Boolean(location.state?.registered)
  );

  useEffect(() => {
    if (location.state?.registered) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setRegistrationSuccess(false);
    setLoading(true);

    try {
      const loginResponse = await api.post(
        '/auth/login/',
        form
      );

      saveTokens(
        loginResponse.data.access,
        loginResponse.data.refresh
      );

      await api.get('/users/me/');

      navigate('/dashboard', {
        replace: true,
      });
    } catch (err) {
      clearTokens();
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="secure-badge">
        <ShieldCheck size={14} />
        Himoyalangan kirish
        <span className="secure-badge-dot" />
      </div>

      <div className="auth-kicker">
        Shaxsiy kabinet / Kirish
      </div>

      <h1 className="auth-title">
        Xush kelibsiz
      </h1>

      <p className="auth-description">
        Email manzilingiz yoki +998 telefon raqamingiz orqali tizimga kiring.
      </p>

      <form
        className="auth-form"
        onSubmit={handleSubmit}
      >
        {registrationSuccess && (
          <motion.div
            className="auth-success"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Registratsiya muvaffaqiyatli yakunlandi. Endi tizimga
            kirishingiz mumkin.
          </motion.div>
        )}

        {error && (
          <motion.div
            className="auth-error"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        <div className="form-field">
          <label className="form-label">
            Email yoki telefon raqam
          </label>

          <div className="input-shell">
            <UserRound
              size={18}
              className="input-icon"
            />

            <input
              className="auth-input"
              type="text"
              name="login"
              placeholder="example@mail.uz yoki +998 90 123 45 67"
              value={form.login}
              onChange={handleChange}
              autoComplete="username"
              required
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">
            Parol
          </label>

          <div className="input-shell">
            <LockKeyhole
              size={18}
              className="input-icon"
            />

            <input
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Parolingizni kiriting"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword((current) => !current)
              }
              aria-label={
                showPassword
                  ? 'Parolni yashirish'
                  : 'Parolni ko‘rsatish'
              }
            >
              {showPassword
                ? <EyeOff size={18} />
                : <Eye size={18} />
              }
            </button>
          </div>
        </div>

        <motion.button
          className="auth-submit"
          type="submit"
          disabled={loading}
          whileTap={{ scale: 0.985 }}
        >
          <span>
            {loading
              ? 'Kirilmoqda...'
              : 'Kabinetga kirish'
            }
          </span>

          <span className="submit-arrow">
            <ArrowRight size={19} />
          </span>
        </motion.button>
      </form>

      <div className="register-block">
        <span>
          Saytdan hali ro‘yxatdan o‘tmaganmisiz?
        </span>

        <Link
          to="/register"
          className="auth-link"
        >
          Ro‘yxatdan o‘tish →
        </Link>
      </div>
    </AuthLayout>
  );
}


export default LoginPage;
