import {
  useEffect,
  useState,
} from 'react';

import { Modal } from '@mantine/core';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ClipboardCheck,
  MessageSquareText,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';

import api from '../api/client';


function MedicalInfoModal({
  opened,
  onClose,
  userId,
}) {
  const navigate = useNavigate();
  const { user: currentUser } = useOutletContext();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!opened || !userId) {
      setData(null);
      setError('');
      return;
    }

    async function load() {
      setLoading(true);
      setError('');

      try {
        const response = await api.get(
          `/medical/users/${userId}/`
        );
        setData(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail
          || 'Tibbiy ma’lumotlarni yuklab bo‘lmadi.'
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [opened, userId]);

  function renderDisplay(answerDisplay) {
    if (answerDisplay === null || answerDisplay === undefined) {
      return 'Javob berilmagan';
    }

    if (Array.isArray(answerDisplay)) {
      return answerDisplay.length
        ? answerDisplay.join(', ')
        : 'Javob berilmagan';
    }

    return String(answerDisplay);
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Kasallik haqida"
      centered
      size="xl"
      radius="lg"
    >
      {loading && (
        <div className="modal-loading-state">
          Ma’lumotlar yuklanmoqda...
        </div>
      )}

      {error && (
        <div className="permission-error medical-modal-error">
          {error}
        </div>
      )}

      {data && (
        <div className="medical-modal-content">
          <div className="medical-person-head">
            <div className="patient-detail-avatar">
              <Stethoscope size={25} />
            </div>

            <div>
              <h3>
                {data.user?.first_name || 'Foydalanuvchi'}{' '}
                {data.user?.last_name || ''}
              </h3>
              <span>{data.user?.email}</span>
            </div>

            <div className="medical-modal-role">
              <ShieldCheck size={14} />
              {data.user?.role_display}
            </div>
          </div>

          {data.user?.role === 'PATIENT'
            && ['DOCTOR', 'ADMIN', 'SUPERADMIN'].includes(currentUser.role)
            && (
              <div className="medical-message-action">
                <button
                  className="primary-dashboard-button"
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/dashboard/messages?patient=${data.user.id}`);
                  }}
                >
                  <MessageSquareText size={17} />
                  Xabar yozish
                </button>
              </div>
            )
          }

          <div
            className={
              data.completion?.is_complete
                ? 'medical-completion medical-complete'
                : 'medical-completion medical-incomplete'
            }
          >
            <ClipboardCheck size={20} />
            <div>
              <strong>Anketa holati</strong>
              <span>
                {data.completion?.required_answered || 0} /{' '}
                {data.completion?.required_total || 0} ta majburiy savol.
              </span>
            </div>
          </div>

          <div className="medical-readonly-list">
            {data.questions?.length ? (
              data.questions.map((question, index) => (
                <div
                  className="medical-readonly-item"
                  key={question.id}
                >
                  <div className="medical-readonly-number">
                    {index + 1}
                  </div>

                  <div>
                    <span>{question.text}</span>
                    <strong>
                      {renderDisplay(question.answer_display)}
                    </strong>
                  </div>
                </div>
              ))
            ) : (
              <div className="modal-empty-text">
                Hozircha tibbiy savollar mavjud emas.
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}


export default MedicalInfoModal;
