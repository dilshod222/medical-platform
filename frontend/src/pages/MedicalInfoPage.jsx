import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useOutletContext } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Save,
  Stethoscope,
} from 'lucide-react';
import { notifications } from '@mantine/notifications';

import api from '../api/client';


function MedicalInfoPage() {
  const { user } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [completion, setCompletion] = useState(null);
  const [answers, setAnswers] = useState({});

  const allowed = useMemo(
    () => user.role === 'PATIENT' || user.role === 'DOCTOR',
    [user.role]
  );

  async function loadMedicalForm() {
    setLoading(true);

    try {
      const response = await api.get('/medical/my/');
      const payload = response.data;
      const initialAnswers = {};

      payload.questions.forEach((question) => {
        if (question.question_type === 'CHECKBOX') {
          initialAnswers[question.id] = Array.isArray(question.answer)
            ? question.answer
            : [];
        } else {
          initialAnswers[question.id] = question.answer ?? '';
        }
      });

      setQuestions(payload.questions);
      setCompletion(payload.completion);
      setAnswers(initialAnswers);
    } catch {
      notifications.show({
        title: 'Xatolik',
        message: 'Tibbiy savollarni yuklab bo‘lmadi.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (allowed) {
      loadMedicalForm();
    } else {
      setLoading(false);
    }
  }, [allowed]);

  function setAnswer(questionId, value) {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  }

  function toggleCheckbox(questionId, optionId) {
    const current = Array.isArray(answers[questionId])
      ? answers[questionId]
      : [];

    const exists = current.includes(optionId);

    setAnswer(
      questionId,
      exists
        ? current.filter((item) => item !== optionId)
        : [...current, optionId]
    );
  }

  async function saveAnswers(event) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await api.put('/medical/my/', {
        answers: questions.map((question) => ({
          question: question.id,
          value: answers[question.id],
        })),
      });

      setCompletion(response.data.completion);

      notifications.show({
        title: 'Saqlandi',
        message: 'Kasallik haqidagi ma’lumotlaringiz saqlandi.',
        color: 'green',
      });
    } catch (error) {
      const firstError = error.response?.data?.errors
        ? Object.values(error.response.data.errors)[0]
        : null;

      notifications.show({
        title: 'Xatolik',
        message: firstError || 'Javoblarni saqlab bo‘lmadi.',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) {
    return (
      <div className="permission-error">
        Ushbu bo‘lim bemor va doktorlar uchun mo‘ljallangan.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="content-card medical-loading-card">
        Savollar yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="page-content">
      <section className="medical-hero-card">
        <div>
          <span className="page-kicker">TIBBIY ANKETA</span>
          <h1>Kasallik haqida</h1>
          <p>
            Quyidagi savollarga imkon qadar aniq javob bering.
            Javoblaringiz sizga hamda vakolatli doktor, admin va
            superadminlarga ko‘rinadi.
          </p>
        </div>

        <div className="medical-hero-icon">
          <Stethoscope size={31} />
        </div>
      </section>

      {completion && (
        <div
          className={
            completion.is_complete
              ? 'medical-completion medical-complete'
              : 'medical-completion medical-incomplete'
          }
        >
          {completion.is_complete
            ? <CheckCircle2 size={20} />
            : <ClipboardCheck size={20} />
          }

          <div>
            <strong>
              {completion.is_complete
                ? 'Majburiy savollar to‘ldirilgan'
                : 'Anketani to‘ldirish davom etmoqda'
              }
            </strong>
            <span>
              {completion.required_answered} / {completion.required_total}
              {' '}ta majburiy savolga javob berilgan.
            </span>
          </div>
        </div>
      )}

      {questions.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <ClipboardCheck size={31} />
          </div>
          <h3>Hozircha savollar mavjud emas</h3>
          <p>Superadmin savollar qo‘shgach, ular shu yerda chiqadi.</p>
        </div>
      ) : (
        <form onSubmit={saveAnswers}>
          <div className="medical-questions-list">
            {questions.map((question, index) => (
              <div
                className="medical-question-card"
                key={question.id}
              >
                <div className="medical-question-number">
                  {String(index + 1).padStart(2, '0')}
                </div>

                <div className="medical-question-body">
                  <div className="medical-question-head">
                    <div>
                      <h3>
                        {question.text}
                        {question.is_required && (
                          <span className="required-star">*</span>
                        )}
                      </h3>
                      <span>{question.question_type_display}</span>
                    </div>
                  </div>

                  {question.question_type === 'TEXTAREA' && (
                    <textarea
                      className="medical-textarea"
                      value={answers[question.id] || ''}
                      onChange={(event) =>
                        setAnswer(question.id, event.target.value)
                      }
                      placeholder="Javobingizni yozing..."
                    />
                  )}

                  {question.question_type === 'DATE' && (
                    <div className="medical-date-shell">
                      <CalendarDays size={18} />
                      <input
                        type="date"
                        value={answers[question.id] || ''}
                        onChange={(event) =>
                          setAnswer(question.id, event.target.value)
                        }
                      />
                    </div>
                  )}

                  {question.question_type === 'RADIO' && (
                    <div className="medical-options-grid">
                      {question.options.map((option) => (
                        <label
                          className="medical-option"
                          key={option.id}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            checked={answers[question.id] === option.id}
                            onChange={() =>
                              setAnswer(question.id, option.id)
                            }
                          />
                          <span>{option.text}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.question_type === 'CHECKBOX' && (
                    <div className="medical-options-grid">
                      {question.options.map((option) => (
                        <label
                          className="medical-option"
                          key={option.id}
                        >
                          <input
                            type="checkbox"
                            checked={
                              Array.isArray(answers[question.id])
                              && answers[question.id].includes(option.id)
                            }
                            onChange={() =>
                              toggleCheckbox(question.id, option.id)
                            }
                          />
                          <span>{option.text}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.question_type === 'SELECT' && (
                    <select
                      className="medical-select"
                      value={answers[question.id] || ''}
                      onChange={(event) =>
                        setAnswer(
                          question.id,
                          event.target.value
                            ? Number(event.target.value)
                            : ''
                        )
                      }
                    >
                      <option value="">Tanlang</option>
                      {question.options.map((option) => (
                        <option
                          key={option.id}
                          value={option.id}
                        >
                          {option.text}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="medical-save-bar">
            <div>
              <strong>Ma’lumotlar maxfiy saqlanadi</strong>
              <span>
                Javoblaringiz boshqa oddiy foydalanuvchilarga ko‘rinmaydi.
              </span>
            </div>

            <button
              className="primary-dashboard-button"
              type="submit"
              disabled={saving}
            >
              <Save size={18} />
              {saving ? 'Saqlanmoqda...' : 'Javoblarni saqlash'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}


export default MedicalInfoPage;
