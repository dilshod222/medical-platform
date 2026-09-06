import {
  useEffect,
  useState,
} from 'react';

import { Modal } from '@mantine/core';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  MessageSquareText,
  Search,
  Stethoscope,
  UserRound,
} from 'lucide-react';

import api from '../api/client';
import MedicalInfoModal from '../components/MedicalInfoModal';


function PatientsPage() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [medicalUserId, setMedicalUserId] = useState(null);

  async function loadPatients() {
    try {
      const response = await api.get('/doctor/patients/', {
        params: { q: search },
      });
      setPatients(response.data);
    } catch {
      setPatients([]);
    }
  }

  const canViewPatients = (
    user.role === 'SUPERADMIN'
    || (user.role === 'DOCTOR' && user.doctor_type)
  );

  useEffect(() => {
    if (canViewPatients) {
      loadPatients();
    }
  }, [search, user.role, user.doctor_type]);

  if (!canViewPatients) {
    return (
      <div className="permission-error">
        Bemorlar ro‘yxatini faqat doktor yoki Superadmin ko‘ra oladi.
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="section-heading">
        <span className="page-kicker">
          {user.role === 'SUPERADMIN'
            ? 'SUPERADMIN'
            : user.doctor_type.name.toUpperCase()
          }
        </span>
        <h1>Bemorlar</h1>
        <p>
          Ro‘yxatdan o‘tgan bemorlar va ularning tibbiy anketalarini ko‘ring.
        </p>
      </div>

      <div className="content-card">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={19} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Bemor qidirish..."
            />
          </div>

          <div className="table-count">
            Jami: {patients.length}
          </div>
        </div>

        <div className="dashboard-table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Bemor</th>
                <th>Telefon</th>
                <th>Profil</th>
                <th>Amallar</th>
              </tr>
            </thead>

            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <div className="table-user">
                      <div className="mini-avatar">
                        <UserRound size={18} />
                      </div>

                      <div>
                        <strong>
                          {patient.first_name || 'Ismsiz'}{' '}
                          {patient.last_name || ''}
                        </strong>
                        <span>{patient.email}</span>
                      </div>
                    </div>
                  </td>

                  <td>{patient.phone || '—'}</td>

                  <td>
                    <span
                      className={
                        patient.profile_complete
                          ? 'status-badge status-green'
                          : 'status-badge status-orange'
                      }
                    >
                      {patient.profile_complete
                        ? 'To‘liq'
                        : 'To‘ldirilmagan'
                      }
                    </span>
                  </td>

                  <td>
                    <div className="table-actions-inline">
                      <button
                        className="table-action-button"
                        type="button"
                        onClick={() => setSelectedPatient(patient)}
                      >
                        Profil
                      </button>

                      <button
                        className="table-action-button table-medical-button"
                        type="button"
                        onClick={() => setMedicalUserId(patient.id)}
                      >
                        <Stethoscope size={15} />
                        Kasallik haqida
                      </button>

                      <button
                        className="table-action-button"
                        type="button"
                        onClick={() =>
                          navigate(`/dashboard/messages?patient=${patient.id}`)
                        }
                      >
                        <MessageSquareText size={15} />
                        Xabar yozish
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        opened={Boolean(selectedPatient)}
        onClose={() => setSelectedPatient(null)}
        title="Bemor profili"
        centered
        size="lg"
        radius="lg"
      >
        {selectedPatient && (
          <div className="patient-detail">
            <div className="patient-detail-head">
              <div className="patient-detail-avatar">
                <UserRound size={25} />
              </div>

              <div>
                <h3>
                  {selectedPatient.first_name}{' '}
                  {selectedPatient.last_name}
                </h3>
                <span>{selectedPatient.email}</span>
              </div>
            </div>

            <div className="patient-detail-grid">
              <div>
                <span>Telefon</span>
                <strong>{selectedPatient.phone || '—'}</strong>
              </div>

              <div>
                <span>Rol</span>
                <strong>{selectedPatient.role_display}</strong>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <MedicalInfoModal
        opened={Boolean(medicalUserId)}
        onClose={() => setMedicalUserId(null)}
        userId={medicalUserId}
      />
    </div>
  );
}


export default PatientsPage;
