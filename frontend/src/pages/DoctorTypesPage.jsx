import {
  useEffect,
  useState,
} from 'react';

import { notifications } from '@mantine/notifications';
import { useOutletContext } from 'react-router-dom';
import {
  Plus,
  Stethoscope,
  Trash2,
  UsersRound,
} from 'lucide-react';

import api from '../api/client';


function DoctorTypesPage() {
  const { user } = useOutletContext();

  const [doctorTypes, setDoctorTypes] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadDoctorTypes() {
    try {
      const response = await api.get('/doctor-types/');
      setDoctorTypes(response.data);
    } catch {
      setDoctorTypes([]);
    }
  }

  useEffect(() => {
    if (user.role === 'SUPERADMIN') {
      loadDoctorTypes();
    }
  }, []);

  async function createDoctorType(event) {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    setLoading(true);

    try {
      await api.post('/doctor-types/', {
        name: name.trim(),
        description: description.trim(),
        is_active: true,
      });

      setName('');
      setDescription('');

      notifications.show({
        title: 'Doktor turi yaratildi',
        message: 'Yangi doktor turi foydalanishga tayyor.',
        color: 'green',
      });

      await loadDoctorTypes();
    } catch (error) {
      const message =
        error.response?.data?.name?.[0]
        || error.response?.data?.detail
        || 'Doktor turini yaratib bo‘lmadi.';

      notifications.show({
        title: 'Xatolik',
        message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }

  async function deleteDoctorType(doctorType) {
    const confirmed = window.confirm(
      `“${doctorType.name}” doktor turini o‘chirmoqchimisiz?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/doctor-types/${doctorType.id}/`);
      await loadDoctorTypes();
    } catch (error) {
      notifications.show({
        title: 'O‘chirib bo‘lmadi',
        message:
          error.response?.data?.detail
          || 'Doktor turini o‘chirib bo‘lmadi.',
        color: 'red',
      });
    }
  }

  if (user.role !== 'SUPERADMIN') {
    return (
      <div className="permission-error">
        Ushbu sahifaga faqat Superadmin kira oladi.
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="section-heading">
        <span className="page-kicker">DOKTOR KLASSIFIKATSIYASI</span>
        <h1>Doktor turlari</h1>
        <p>
          Doktor maqomlarini yarating. Admin foydalanuvchiga Doctor rolini
          berayotganda shu ro‘yxatdan tur tanlaydi.
        </p>
      </div>

      <form
        className="doctor-type-builder"
        onSubmit={createDoctorType}
      >
        <div className="builder-header">
          <div className="builder-icon">
            <Stethoscope size={23} />
          </div>
          <div>
            <strong>Yangi doktor turi</strong>
            <span>Masalan: Terapevt, Kardiolog, Pediatr yoki Type 1.</span>
          </div>
        </div>

        <div className="doctor-type-form-grid">
          <div className="dashboard-field">
            <label>Doktor turi nomi</label>
            <input
              className="dashboard-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Masalan: Kardiolog"
            />
          </div>

          <div className="dashboard-field">
            <label>Izoh</label>
            <input
              className="dashboard-input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Qisqa tavsif (ixtiyoriy)"
            />
          </div>
        </div>

        <div className="builder-footer">
          <button
            className="primary-dashboard-button"
            type="submit"
            disabled={loading}
          >
            <Plus size={18} />
            {loading ? 'Yaratilmoqda...' : 'Doktor turi yaratish'}
          </button>
        </div>
      </form>

      <div className="doctor-types-grid">
        {doctorTypes.map((doctorType) => (
          <div
            className="doctor-type-card"
            key={doctorType.id}
          >
            <div className="doctor-type-card-icon">
              <Stethoscope size={24} />
            </div>

            <div className="doctor-type-card-body">
              <h3>{doctorType.name}</h3>
              <p>
                {doctorType.description || 'Qo‘shimcha izoh kiritilmagan.'}
              </p>

              <div className="doctor-type-count">
                <UsersRound size={16} />
                {doctorType.doctor_count} ta doktor
              </div>
            </div>

            <button
              className="doctor-type-delete"
              type="button"
              onClick={() => deleteDoctorType(doctorType)}
              aria-label="Doktor turini o‘chirish"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}

        {doctorTypes.length === 0 && (
          <div className="empty-state-card doctor-types-empty">
            <div className="empty-state-icon">
              <Stethoscope size={31} />
            </div>
            <h3>Doktor turlari hali yaratilmagan</h3>
            <p>Yuqoridagi forma orqali birinchi doktor turini yarating.</p>
          </div>
        )}
      </div>
    </div>
  );
}


export default DoctorTypesPage;
