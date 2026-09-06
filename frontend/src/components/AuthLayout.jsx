import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  HeartPulse,
  MessageCircleHeart,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  UserRoundCheck,
} from 'lucide-react';

import { hasAuthTokens } from '../auth/tokenStorage';
import '../styles/auth.css';


function AuthLayout({ children }) {
  const brandDestination = hasAuthTokens()
    ? '/dashboard'
    : '/login';

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="hero-grid" />

        <Link
          to={brandDestination}
          style={{
            color: 'inherit',
            textDecoration: 'none',
            width: 'fit-content',
            position: 'relative',
            zIndex: 6,
          }}
        >
          <motion.div
            className="brand"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="brand-icon">
              <HeartPulse size={27} strokeWidth={2.3} />
            </div>

            <div>
              <div className="brand-name">
                MedConnect
              </div>

              <div className="brand-subtitle">
                Medical Platform
              </div>
            </div>
          </motion.div>
        </Link>

        <motion.div
          className="hero-content"
          initial={{ opacity: 0, x: -35 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.75,
            delay: 0.15,
          }}
        >
          <div className="hero-eyebrow">
            <span className="live-dot" />
            BEMOR VA SHIFOKOR — BIR TIZIMDA
          </div>

          <h1 className="hero-title">
            Sog‘liq uchun
            <br />
            <span>tezkor aloqa.</span>
          </h1>

          <p className="hero-description">
            Bemorlar va shifokorlar o‘rtasidagi
            muloqotni yagona, xavfsiz va qulay
            platformada boshqaring.
          </p>

          <motion.div
            className="hero-register-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.35,
              duration: 0.55,
            }}
          >
            <div className="hero-register-text">
              <div className="hero-register-icon">
                <UserPlus size={20} />
              </div>

              <div>
                <span>Yangi bemormisiz?</span>
                <strong>Avval ro‘yxatdan o‘ting</strong>
              </div>
            </div>

            <Link
              to="/register"
              className="hero-register-button"
            >
              Ro‘yxatdan o‘tish
              <span>
                <ArrowRight size={18} />
              </span>
            </Link>
          </motion.div>

          <div className="feature-list">
            <motion.div
              className="hero-feature"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <div className="feature-icon">
                <UserRoundCheck size={20} />
              </div>

              <div>
                <strong>01&nbsp;&nbsp; Bemor profili</strong>
                <span>Ma’lumotlar yagona kabinetda</span>
              </div>
            </motion.div>

            <motion.div
              className="hero-feature"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <div className="feature-icon">
                <Stethoscope size={20} />
              </div>

              <div>
                <strong>02&nbsp;&nbsp; Shifokor nazorati</strong>
                <span>Bemorlar bilan bevosita ishlash</span>
              </div>
            </motion.div>

            <motion.div
              className="hero-feature"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
            >
              <div className="feature-icon">
                <MessageCircleHeart size={20} />
              </div>

              <div>
                <strong>03&nbsp;&nbsp; Xavfsiz aloqa</strong>
                <span>Xabar va tavsiyalar bir joyda</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <div className="ecg-wrapper">
          <svg
            viewBox="0 0 900 120"
            preserveAspectRatio="none"
            className="ecg-svg"
          >
            <motion.path
              d="M0 65 L170 65 L205 65 L225 48 L245 82 L270 18 L295 100 L320 65 L395 65 L425 65 L445 52 L465 77 L490 30 L515 92 L540 65 L900 65"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              initial={{
                pathLength: 0,
                opacity: 0.2,
              }}
              animate={{
                pathLength: 1,
                opacity: 0.7,
              }}
              transition={{
                duration: 2.3,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
            />
          </svg>
        </div>

        <motion.div
          className="floating-status"
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div className="floating-icon">
            <Activity size={19} />
          </div>

          <div>
            <span>Tizim holati</span>
            <strong>Faol va himoyalangan</strong>
          </div>

          <div className="status-indicator" />
        </motion.div>

        <div className="hero-footer">
          <ShieldCheck size={16} />
          <span>Himoyalangan tibbiy platforma</span>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-soft-glow" />

        <motion.div
          className="auth-panel"
          initial={{
            opacity: 0,
            x: 35,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.7,
            delay: 0.1,
          }}
        >
          {children}
        </motion.div>
      </section>
    </div>
  );
}


export default AuthLayout;
