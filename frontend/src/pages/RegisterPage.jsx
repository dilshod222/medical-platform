import { useState } from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import AuthLayout from '../components/AuthLayout';
import api from '../api/client';
import { getApiErrorMessage } from '../utils/apiError';


function formatNationalPhone(digits) {
  const value = digits.slice(0, 9);
  const parts = [];

  if (value.length > 0) {
    parts.push(value.slice(0, 2));
  }
  if (value.length > 2) {
    parts.push(value.slice(2, 5));
  }
  if (value.length > 5) {
    parts.push(value.slice(5, 7));
  }
  if (value.length > 7) {
    parts.push(value.slice(7, 9));
  }

  return parts.join(' ');
}


function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirm: '',
  });

  const [phoneDigits, setPhoneDigits] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handlePhoneChange(event) {
    let digits = event.target.value.replace(/\D/g, '');

    if (digits.startsWith('998')) {
      digits = digits.slice(3);
    }

    setPhoneDigits(digits.slice(0, 9));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (phoneDigits.length !== 9) {
      setError('Telefon raqamni to‘liq kiriting: +998 XX XXX XX XX.');
      return;
    }

    if (form.password !== form.password_confirm) {
      setError('Parollar bir xil emas.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/register/', {
        ...form,
        phone: `+998${phoneDigits}`,
      });

      navigate('/login', {
        replace: true,
        state: {
          registered: true,
        },
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="secure-badge">
        <ShieldCheck size={14} />
        Xavfsiz registratsiya
        <span className="secure-badge-dot" />
      </div>

      <div className="auth-kicker">
        Bemor / Registratsiya
      </div>

      <h1 className="auth-title">
        Akkaunt yarating
      </h1>

      <p className="auth-description">
        Bemor sifatida ro‘yxatdan o‘ting va shaxsiy kabinetingizdan
        foydalanishni boshlang.
      </p>

      <form
        className="auth-form"
        onSubmit={handleSubmit}
      >
        {error && (
          <motion.div
            className="auth-error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 15,
          }}
        >
          <div className="form-field">
            <label className="form-label">
              Ism
            </label>

            <div className="input-shell">
              <UserRound
                size={18}
                className="input-icon"
              />

              <input
                className="auth-input"
                name="first_name"
                placeholder="Ali"
                value={form.first_name}
                onChange={handleChange}
                autoComplete="given-name"
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">
              Familiya
            </label>

            <div className="input-shell">
              <UserRound
                size={18}
                className="input-icon"
              />

              <input
                className="auth-input"
                name="last_name"
                placeholder="Valiyev"
                value={form.last_name}
                onChange={handleChange}
                autoComplete="family-name"
                required
              />
            </div>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">
            Telefon raqam
          </label>

          <div className="input-shell">
            <Phone
              size={18}
              className="input-icon"
            />

            <span
              style={{
                position: 'absolute',
                left: 47,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#31463d',
                fontSize: 14,
                fontWeight: 700,
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              +998
            </span>

            <input
              className="auth-input"
              type="tel"
              inputMode="numeric"
              value={formatNationalPhone(phoneDigits)}
              onChange={handlePhoneChange}
              placeholder="__ ___ __ __"
              autoComplete="tel-national"
              style={{
                paddingLeft: 88,
              }}
              required
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">
            Email
          </label>

          <div className="input-shell">
            <Mail
              size={18}
              className="input-icon"
            />

            <input
              className="auth-input"
              type="email"
              name="email"
              placeholder="example@mail.uz"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 15,
          }}
        >
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
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">
              Parolni takrorlang
            </label>

            <div className="input-shell">
              <LockKeyhole
                size={18}
                className="input-icon"
              />

              <input
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                name="password_confirm"
                placeholder="••••••••"
                value={form.password_confirm}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword((value) => !value)
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
        </div>

        <motion.button
          className="auth-submit"
          type="submit"
          disabled={loading}
          whileTap={{ scale: 0.985 }}
        >
          <span>
            {loading
              ? 'Yaratilmoqda...'
              : 'Ro‘yxatdan o‘tish'
            }
          </span>

          <span className="submit-arrow">
            <ArrowRight size={19} />
          </span>
        </motion.button>
      </form>

      <div className="register-block">
        <span>
          Akkauntingiz allaqachon mavjudmi?
        </span>

        <Link
          to="/login"
          className="auth-link"
        >
          Tizimga kirish →
        </Link>
      </div>
    </AuthLayout>
  );
}


export default RegisterPage;
