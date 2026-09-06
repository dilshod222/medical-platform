import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { notifications } from '@mantine/notifications';
import { useOutletContext } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  CircleDot,
  ClipboardList,
  GripVertical,
  Plus,
  TextCursorInput,
  Trash2,
} from 'lucide-react';

import api from '../api/client';


function QuestionsPage() {
  const { user } = useOutletContext();

  const [questions, setQuestions] = useState([]);
  const [text, setText] = useState('');
  const [type, setType] = useState('TEXTAREA');
  const [required, setRequired] = useState(true);
  const [options, setOptions] = useState(['', '']);
  const [reordering, setReordering] = useState(false);

  const needsOptions = (
    type === 'RADIO'
    || type === 'CHECKBOX'
    || type === 'SELECT'
  );

  const nextOrder = useMemo(() => {
    if (questions.length === 0) {
      return 0;
    }

    return Math.max(...questions.map((item) => item.order ?? 0)) + 1;
  }, [questions]);

  async function loadQuestions() {
    try {
      const response = await api.get('/questions/');
      setQuestions(response.data);
    } catch {
      setQuestions([]);
    }
  }

  useEffect(() => {
    if (user.role === 'SUPERADMIN') {
      loadQuestions();
    }
  }, []);

  function updateOption(index, value) {
    setOptions((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? value : item
      )
    );
  }

  function addOption() {
    setOptions((current) => [...current, '']);
  }

  function removeOption(index) {
    setOptions((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function resetBuilder() {
    setText('');
    setType('TEXTAREA');
    setRequired(true);
    setOptions(['', '']);
  }

  async function createQuestion(event) {
    event.preventDefault();

    if (!text.trim()) {
      notifications.show({
        title: 'Savol matni kerak',
        message: 'Savol matnini kiriting.',
        color: 'orange',
      });
      return;
    }

    const payload = {
      text: text.trim(),
      question_type: type,
      is_required: required,
      is_active: true,
      order: nextOrder,
    };

    if (needsOptions) {
      payload.options = options
        .filter((option) => option.trim())
        .map((option, index) => ({
          text: option.trim(),
          order: index,
        }));

      if (payload.options.length < 2) {
        notifications.show({
          title: 'Variant yetarli emas',
          message: 'Kamida 2 ta javob varianti kiriting.',
          color: 'orange',
        });
        return;
      }
    }

    try {
      await api.post('/questions/', payload);
      resetBuilder();

      notifications.show({
        title: 'Savol qo‘shildi',
        message: 'Yangi tibbiy savol anketaning oxiriga qo‘shildi.',
        color: 'green',
      });

      await loadQuestions();
    } catch (error) {
      const data = error.response?.data;
      const firstError = data?.options?.[0] || data?.detail;

      notifications.show({
        title: 'Xatolik',
        message: firstError || 'Savolni saqlab bo‘lmadi.',
        color: 'red',
      });
    }
  }

  async function moveQuestion(index, direction) {
    const targetIndex = index + direction;

    if (
      targetIndex < 0
      || targetIndex >= questions.length
      || reordering
    ) {
      return;
    }

    const reordered = [...questions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setQuestions(reordered);
    setReordering(true);

    try {
      const response = await api.post('/questions/reorder/', {
        question_ids: reordered.map((question) => question.id),
      });

      setQuestions(response.data);
    } catch (error) {
      await loadQuestions();

      notifications.show({
        title: 'Tartibni o‘zgartirib bo‘lmadi',
        message: error.response?.data?.detail || 'Qayta urinib ko‘ring.',
        color: 'red',
      });
    } finally {
      setReordering(false);
    }
  }

  async function deleteQuestion(id) {
    const confirmed = window.confirm(
      'Savolni o‘chirmoqchimisiz? Ushbu savolga berilgan javoblar ham o‘chadi.'
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/questions/${id}/`);
      await loadQuestions();
    } catch {
      notifications.show({
        title: 'Xatolik',
        message: 'Savolni o‘chirib bo‘lmadi.',
        color: 'red',
      });
    }
  }

  function typeIcon(questionType) {
    if (questionType === 'DATE') {
      return <CalendarDays size={18} />;
    }
    if (questionType === 'RADIO') {
      return <CircleDot size={18} />;
    }
    if (questionType === 'CHECKBOX') {
      return <CheckSquare size={18} />;
    }
    if (questionType === 'SELECT') {
      return <ChevronDown size={18} />;
    }
    return <TextCursorInput size={18} />;
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
        <span className="page-kicker">FORMA KONSTRUKTORI</span>
        <h1>Savollar</h1>
        <p>
          Bemor va doktorlar to‘ldiradigan tibbiy anketani boshqaring.
          Yangi savol avtomatik oxiriga tushadi, tartibni esa quyidagi
          yuqoriga/pastga tugmalari orqali o‘zingiz belgilaysiz.
        </p>
      </div>

      <form
        className="question-builder"
        onSubmit={createQuestion}
      >
        <div className="builder-header">
          <div className="builder-icon">
            <ClipboardList size={23} />
          </div>

          <div>
            <strong>Yangi savol</strong>
            <span>
              Matn, sana, radio, checkbox yoki select turidagi savol yarating.
            </span>
          </div>
        </div>

        <textarea
          className="question-title-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Savol matnini yozing..."
        />

        <div className="builder-settings">
          <div className="dashboard-field builder-type-field">
            <label>Javob turi</label>
            <select
              className="dashboard-input"
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setOptions(['', '']);
              }}
            >
              <option value="TEXTAREA">Matn maydoni</option>
              <option value="DATE">Sana</option>
              <option value="RADIO">Bitta variant (Radio)</option>
              <option value="CHECKBOX">Bir nechta variant (Checkbox)</option>
              <option value="SELECT">Tanlov ro‘yxati (Select)</option>
            </select>
          </div>

          <label className="required-control">
            <input
              type="checkbox"
              checked={required}
              onChange={(event) => setRequired(event.target.checked)}
            />
            Majburiy savol
          </label>
        </div>

        {needsOptions && (
          <div className="question-options">
            <div className="options-heading">
              Javob variantlari
            </div>

            {options.map((option, index) => (
              <div
                className="question-option-row"
                key={index}
              >
                {type === 'RADIO' && <CircleDot size={18} />}
                {type === 'CHECKBOX' && <CheckSquare size={18} />}
                {type === 'SELECT' && <ChevronDown size={18} />}

                <input
                  value={option}
                  onChange={(event) =>
                    updateOption(index, event.target.value)
                  }
                  placeholder={`Variant ${index + 1}`}
                />

                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    aria-label="Variantni o‘chirish"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              className="add-option-button"
              onClick={addOption}
            >
              <Plus size={17} />
              Variant qo‘shish
            </button>
          </div>
        )}

        <div className="builder-footer">
          <button
            className="primary-dashboard-button"
            type="submit"
          >
            <Plus size={18} />
            Savol qo‘shish
          </button>
        </div>
      </form>

      <div className="questions-list">
        {questions.map((question, index) => (
          <div
            className="question-card"
            key={question.id}
          >
            <div className="question-order-controls">
              <GripVertical size={18} className="question-grip" />

              <button
                type="button"
                onClick={() => moveQuestion(index, -1)}
                disabled={index === 0 || reordering}
                aria-label="Savolni yuqoriga ko‘tarish"
              >
                <ArrowUp size={16} />
              </button>

              <button
                type="button"
                onClick={() => moveQuestion(index, 1)}
                disabled={index === questions.length - 1 || reordering}
                aria-label="Savolni pastga tushirish"
              >
                <ArrowDown size={16} />
              </button>
            </div>

            <div className="question-number">
              {index + 1}
            </div>

            <div className="question-card-type-icon">
              {typeIcon(question.question_type)}
            </div>

            <div className="question-card-body">
              <div className="question-card-title">
                {question.text}
              </div>

              <div className="question-meta">
                <span>{question.question_type_display}</span>
                {question.is_required && <span>Majburiy</span>}
                <span>Tartib: {index + 1}</span>
              </div>

              {question.options?.length > 0 && (
                <div className="saved-options">
                  {question.options.map((option) => (
                    <div key={option.id}>
                      • {option.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              className="question-delete-button"
              onClick={() => deleteQuestion(question.id)}
              type="button"
              aria-label="Savolni o‘chirish"
            >
              <Trash2 size={19} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


export default QuestionsPage;
