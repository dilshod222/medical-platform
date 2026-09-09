import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  ArchiveX,
  CheckCheck,
  Edit3,
  MessageCirclePlus,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserRound,
} from 'lucide-react';
import {
  useOutletContext,
  useSearchParams,
} from 'react-router-dom';

import api from '../api/client';
import TablePagination, {
  DEFAULT_PAGE_SIZE,
} from '../components/TablePagination';


const STAFF_ROLES = ['DOCTOR', 'ADMIN', 'SUPERADMIN'];


function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}


function shortDate(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}


function fullName(person) {
  if (!person) {
    return 'Foydalanuvchi';
  }

  const result = `${person.first_name || ''} ${person.last_name || ''}`.trim();
  return result || person.email || 'Foydalanuvchi';
}


function staffSubtitle(staff) {
  if (!staff) {
    return '';
  }

  if (staff.role === 'DOCTOR') {
    return staff.doctor_type_name || 'Doktor';
  }

  return staff.role_display || staff.role;
}


function visibilityText(thread) {
  if (thread.hidden_for_staff && thread.hidden_for_patient) {
    return 'Ikkala tomonda yashirilgan';
  }

  if (thread.hidden_for_staff) {
    return 'Doktor yashirgan';
  }

  if (thread.hidden_for_patient) {
    return 'Bemor yashirgan';
  }

  return 'Faol';
}


function MessagesPage() {
  const { user } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const messagesEndRef = useRef(null);

  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [auditMode, setAuditMode] = useState(false);

  const [search, setSearch] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [auditPage, setAuditPage] = useState(1);

  const [messageText, setMessageText] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const [newChatOpened, setNewChatOpened] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState([]);

  const [editMessage, setEditMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [deleteMessage, setDeleteMessage] = useState(null);
  const [hideThreadOpened, setHideThreadOpened] = useState(false);

  const isSupervisorRole = (
    user.role === 'ADMIN'
    || user.role === 'SUPERADMIN'
  );

  const isSupervisor = isSupervisorRole && auditMode;
  const canStartChat = STAFF_ROLES.includes(user.role);


  useEffect(() => {
    setAuditPage(1);
  }, [
    search,
    staffFilter,
    patientFilter,
    visibilityFilter,
    auditMode,
  ]);


  const auditTotalPages = Math.max(
    1,
    Math.ceil(
      threads.length / DEFAULT_PAGE_SIZE
    )
  );


  useEffect(() => {
    if (auditPage > auditTotalPages) {
      setAuditPage(auditTotalPages);
    }
  }, [auditPage, auditTotalPages]);


  const paginatedAuditThreads = useMemo(
    () => {
      const start = (
        auditPage - 1
      ) * DEFAULT_PAGE_SIZE;

      return threads.slice(
        start,
        start + DEFAULT_PAGE_SIZE
      );
    },
    [threads, auditPage]
  );


  useEffect(() => {
    document.body.classList.add('chat-route-active');

    return () => {
      document.body.classList.remove('chat-route-active');
    };
  }, []);


  const loadThreads = useCallback(async () => {
    try {
      const params = {
        q: search || undefined,
      };

      if (isSupervisorRole) {
        params.scope = auditMode ? 'audit' : 'mine';
      }

      if (isSupervisor) {
        params.staff_q = staffFilter || undefined;
        params.patient_q = patientFilter || undefined;
        params.visibility = visibilityFilter || 'all';
      }

      const response = await api.get('/chat/threads/', {
        params,
      });

      setThreads(response.data);

      if (selectedThread) {
        const refreshed = response.data.find(
          (item) => item.id === selectedThread.id
        );

        if (refreshed) {
          setSelectedThread(refreshed);
        }
      }
    } catch (error) {
      notifications.show({
        title: 'Xatolik',
        message:
          error.response?.data?.detail
          || 'Yozishmalarni yuklab bo‘lmadi.',
        color: 'red',
      });
    } finally {
      setLoadingThreads(false);
    }
  }, [
    search,
    staffFilter,
    patientFilter,
    visibilityFilter,
    isSupervisor,
    isSupervisorRole,
    auditMode,
    selectedThread?.id,
  ]);


  const loadMessages = useCallback(async (threadId, silent = false) => {
    if (!threadId) {
      setMessages([]);
      return;
    }

    if (!silent) {
      setLoadingMessages(true);
    }

    try {
      const response = await api.get(
        `/chat/threads/${threadId}/messages/`,
        {
          params: {
            audit: isSupervisor ? 1 : undefined,
          },
        }
      );

      setSelectedThread(response.data.thread);
      setMessages(response.data.messages);

      if (!isSupervisor) {
        window.dispatchEvent(
          new Event('chat-unread-changed')
        );
      }
    } catch (error) {
      if (!silent) {
        notifications.show({
          title: 'Xatolik',
          message:
            error.response?.data?.detail
            || 'Xabarlarni yuklab bo‘lmadi.',
          color: 'red',
        });
      }
    } finally {
      if (!silent) {
        setLoadingMessages(false);
      }
    }
  }, [isSupervisor]);


  async function loadPatients() {
    if (!canStartChat) {
      return;
    }

    try {
      const response = await api.get('/chat/patients/', {
        params: {
          q: patientSearch || undefined,
        },
      });

      setPatients(response.data);
    } catch {
      setPatients([]);
    }
  }


  async function openOrCreateThread(patientId) {
    try {
      const response = await api.post('/chat/threads/', {
        patient_id: patientId,
      });

      setNewChatOpened(false);
      setPatientSearch('');
      setSearchParams({});
      setSelectedThread(response.data);
      await loadThreads();
      await loadMessages(response.data.id);
    } catch (error) {
      notifications.show({
        title: 'Yozishmani ochib bo‘lmadi',
        message:
          error.response?.data?.detail
          || 'Bemor bilan yozishma yaratilmadi.',
        color: 'red',
      });
    }
  }


  async function sendMessage(event) {
    event?.preventDefault();

    const body = messageText.trim();

    if (!body || !selectedThread?.can_send || sending) {
      return;
    }

    setSending(true);

    try {
      await api.post(
        `/chat/threads/${selectedThread.id}/messages/`,
        { body }
      );

      setMessageText('');
      await loadMessages(selectedThread.id, true);
      await loadThreads();
    } catch (error) {
      notifications.show({
        title: 'Xabar yuborilmadi',
        message:
          error.response?.data?.detail
          || 'Xabarni yuborib bo‘lmadi.',
        color: 'red',
      });
    } finally {
      setSending(false);
    }
  }


  async function saveEditedMessage() {
    const body = editText.trim();

    if (!editMessage || !body) {
      return;
    }

    try {
      await api.patch(
        `/chat/messages/${editMessage.id}/`,
        { body }
      );

      setEditMessage(null);
      setEditText('');
      await loadMessages(selectedThread.id, true);
      await loadThreads();

      notifications.show({
        title: 'Xabar tahrirlandi',
        message: 'O‘zgarishlar saqlandi.',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Xatolik',
        message:
          error.response?.data?.detail
          || 'Xabarni tahrirlab bo‘lmadi.',
        color: 'red',
      });
    }
  }


  async function confirmDeleteMessage() {
    if (!deleteMessage) {
      return;
    }

    try {
      await api.delete(
        `/chat/messages/${deleteMessage.id}/`
      );

      setDeleteMessage(null);
      await loadMessages(selectedThread.id, true);
      await loadThreads();

      notifications.show({
        title: 'Xabar o‘chirildi',
        message: 'Xabar foydalanuvchi yozishmasidan olib tashlandi.',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Xatolik',
        message:
          error.response?.data?.detail
          || 'Xabarni o‘chirib bo‘lmadi.',
        color: 'red',
      });
    }
  }


  async function confirmHideThread() {
    if (!selectedThread?.id) {
      return;
    }

    try {
      await api.delete(
        `/chat/threads/${selectedThread.id}/`
      );

      setHideThreadOpened(false);
      setSelectedThread(null);
      setMessages([]);
      await loadThreads();

      notifications.show({
        title: 'Yozishma olib tashlandi',
        message:
          'Yozishma sizning ro‘yxatingizdan yashirildi. Audit tarixida saqlanib qoladi.',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Xatolik',
        message:
          error.response?.data?.detail
          || 'Yozishmani olib tashlab bo‘lmadi.',
        color: 'red',
      });
    }
  }


  useEffect(() => {
    setLoadingThreads(true);
    const timer = setTimeout(loadThreads, 220);
    return () => clearTimeout(timer);
  }, [
    search,
    staffFilter,
    patientFilter,
    visibilityFilter,
    auditMode,
  ]);


  useEffect(() => {
    if (newChatOpened) {
      const timer = setTimeout(loadPatients, 180);
      return () => clearTimeout(timer);
    }
  }, [newChatOpened, patientSearch]);


  useEffect(() => {
    const patientId = searchParams.get('patient');

    if (
      patientId
      && canStartChat
      && !Number.isNaN(Number(patientId))
    ) {
      openOrCreateThread(Number(patientId));
    }
  }, []);


  useEffect(() => {
    if (!selectedThread?.id) {
      return undefined;
    }

    const interval = setInterval(() => {
      loadMessages(selectedThread.id, true);
      loadThreads();
    }, 8000);

    return () => clearInterval(interval);
  }, [selectedThread?.id]);


  useEffect(() => {
    if (!messages.length) {
      return;
    }

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    });
  }, [messages.length, selectedThread?.id]);


  const selectedCounterparty = useMemo(() => {
    if (!selectedThread) {
      return null;
    }

    if (user.role === 'PATIENT') {
      return selectedThread.staff;
    }

    return selectedThread.patient;
  }, [selectedThread, user.role]);


  function openThread(thread) {
    setSelectedThread(thread);
    loadMessages(thread.id);
  }


  function closeSupervisorChat() {
    setSelectedThread(null);
    setMessages([]);
    setMessageText('');
  }


  function toggleAuditMode() {
    const nextMode = !auditMode;

    setAuditMode(nextMode);
    setSelectedThread(null);
    setMessages([]);
    setMessageText('');
    setSearch('');
    setStaffFilter('');
    setPatientFilter('');
    setVisibilityFilter('all');
    setSearchParams({});
  }


  function beginEdit(message) {
    setEditMessage(message);
    setEditText(message.body);
  }


  function handleComposerKeyDown(event) {
    if (
      event.key === 'Enter'
      && !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }


  function isOutgoing(message) {
    if (!selectedThread) {
      return false;
    }

    if (isSupervisor) {
      return message.sender?.id === selectedThread.staff?.id;
    }

    return message.sender?.id === user.id;
  }


  function renderMessage(message) {
    const deleted = message.is_deleted;
    const outgoing = isOutgoing(message);

    return (
      <div
        key={message.id}
        className={
          `chat-message-row ${
            outgoing
              ? 'chat-message-outgoing'
              : 'chat-message-incoming'
          }`
        }
      >
        <div
          className={
            `chat-message-bubble ${
              deleted ? 'chat-message-deleted' : ''
            }`
          }
        >
          {isSupervisor && (
            <div className="chat-message-sender-label">
              {fullName(message.sender)}
              {' · '}
              {message.sender?.role === 'PATIENT'
                ? 'Bemor'
                : staffSubtitle(message.sender)
              }
            </div>
          )}

          <div className="chat-message-body">
            {deleted
              ? 'Xabar o‘chirilgan'
              : message.body
            }
          </div>

          <div className="chat-message-meta">
            {message.edited_at && !deleted && (
              <span>tahrirlangan</span>
            )}

            <span>{formatDateTime(message.created_at)}</span>

            {!deleted
              && outgoing
              && message.is_read
              && (
                <CheckCheck size={16} />
              )
            }
          </div>

          {!deleted
            && (message.can_edit || message.can_delete)
            && (
              <div className="chat-message-actions">
                {message.can_edit && (
                  <button
                    type="button"
                    onClick={() => beginEdit(message)}
                    title="Tahrirlash"
                  >
                    <Edit3 size={16} />
                  </button>
                )}

                {message.can_delete && (
                  <button
                    type="button"
                    onClick={() => setDeleteMessage(message)}
                    title="O‘chirish"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )
          }
        </div>
      </div>
    );
  }


  const chatPanel = selectedThread ? (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <div className="chat-person-avatar">
          {user.role === 'PATIENT'
            ? <Stethoscope size={23} />
            : <UserRound size={23} />
          }
        </div>

        <div className="chat-panel-person">
          <strong>{fullName(selectedCounterparty)}</strong>
          <span>
            {user.role === 'PATIENT'
              ? staffSubtitle(selectedThread.staff)
              : `Bemor · ${selectedThread.patient.phone || selectedThread.patient.email}`
            }
          </span>
        </div>

        <div className="chat-header-actions">
          {selectedThread.can_hide && (
            <button
              className="chat-refresh-button"
              type="button"
              onClick={() => setHideThreadOpened(true)}
              title="Yozishmani ro‘yxatdan olib tashlash"
            >
              <ArchiveX size={18} />
            </button>
          )}

          <button
            className="chat-refresh-button"
            type="button"
            onClick={() => loadMessages(selectedThread.id)}
            title="Yangilash"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="chat-messages-scroll">
        {loadingMessages ? (
          <div className="chat-center-state">
            Xabarlar yuklanmoqda...
          </div>
        ) : messages.length ? (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="chat-empty-conversation">
            <div>
              <MessageSquareText size={34} />
            </div>
            <strong>Yozishma hali boshlanmagan</strong>
            <span>
              {selectedThread.can_send && !isSupervisor
                ? user.role === 'PATIENT'
                  ? 'Doktorga javob yozishingiz mumkin.'
                  : 'Bemorga birinchi xabaringizni yozing.'
                : 'Audit rejimida yozish faollashtirilmagan.'
              }
            </span>
          </div>
        )}
      </div>

      {selectedThread.can_send && !isSupervisor ? (
        <form
          className="chat-composer"
          onSubmit={sendMessage}
        >
          <textarea
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder={
              user.role === 'PATIENT'
                ? 'Javob yozing...'
                : 'Xabar yozing...'
            }
            maxLength={2000}
            rows={1}
          />

          <span className="chat-char-count">
            {messageText.length}/2000
          </span>

          <button
            className="chat-send-button"
            type="submit"
            disabled={!messageText.trim() || sending}
            title="Yuborish"
          >
            <Send size={20} />
          </button>
        </form>
      ) : (
        <div className="chat-readonly-footer">
          <ShieldCheck size={18} />
          Audit rejimi: yozishmalar ko‘riladi, bu oynadan yangi xabar yuborilmaydi.
        </div>
      )}
    </div>
  ) : (
    <div className="chat-panel chat-panel-empty">
      <div className="chat-empty-conversation">
        <div>
          <MessageSquareText size={36} />
        </div>
        <strong>Yozishmani tanlang</strong>
        <span>
          Chap tomondan suhbatni tanlang.
        </span>
      </div>
    </div>
  );


  return (
    <div className="page-content chat-page-content">
      <div className="section-heading chat-section-heading">
        <div>
          <span className="page-kicker">
            {isSupervisor
              ? 'YOZISHMALAR NAZORATI'
              : 'XABARLAR'
            }
          </span>
          <h1>{isSupervisor ? 'Yozishmalarni o‘qish' : 'Xabarlar'}</h1>
          <p>
            {isSupervisor
              ? 'Doktor, admin va bemorlar o‘rtasidagi yozishmalarni audit rejimida ko‘ring.'
              : user.role === 'PATIENT'
                ? 'Doktorlardan kelgan xabarlarni ko‘ring va ularga javob qaytaring.'
                : 'Sizga tegishli bemor yozishmalarini ko‘ring va javob qaytaring.'
            }
          </p>
        </div>

        <div className="chat-heading-actions">
          {isSupervisorRole && (
            <button
              className={
                `chat-audit-toggle-button ${
                  isSupervisor
                    ? 'chat-audit-toggle-button-active'
                    : ''
                }`
              }
              type="button"
              onClick={toggleAuditMode}
            >
              <ShieldCheck size={18} />
              {isSupervisor
                ? 'Mening xabarlarim'
                : 'Yozishmalarni o‘qish'
              }
            </button>
          )}

          {canStartChat && !isSupervisor && (
            <button
              className="primary-dashboard-button chat-new-button"
              type="button"
              onClick={() => setNewChatOpened(true)}
            >
              <MessageCirclePlus size={18} />
              Yangi xabar
            </button>
          )}
        </div>
      </div>

      {isSupervisor ? (
        <div className="content-card chat-management-card">
          <div className="chat-supervisor-filters">
            <div className="search-box chat-management-search">
              <Search size={19} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Umumiy qidiruv..."
              />
            </div>

            <input
              className="chat-filter-input"
              value={staffFilter}
              onChange={(event) => setStaffFilter(event.target.value)}
              placeholder="Doktor / xodim..."
            />

            <input
              className="chat-filter-input"
              value={patientFilter}
              onChange={(event) => setPatientFilter(event.target.value)}
              placeholder="Bemor..."
            />

            <select
              className="chat-filter-select"
              value={visibilityFilter}
              onChange={(event) => setVisibilityFilter(event.target.value)}
            >
              <option value="all">Barchasi</option>
              <option value="active">Faol yozishmalar</option>
              <option value="hidden_any">Yashirilganlar</option>
              <option value="staff_hidden">Doktor yashirgan</option>
              <option value="patient_hidden">Bemor yashirgan</option>
            </select>

            <div className="table-count">
              Jami: {threads.length}
            </div>
          </div>

          <div className="dashboard-table-wrapper chat-management-table-wrapper">
            <table className="dashboard-table chat-management-table">
              <thead>
                <tr>
                  <th>T/R</th>
                  <th>Doktor / xodim</th>
                  <th>Bemor</th>
                  <th>Oxirgi xabar</th>
                  <th>Vaqt</th>
                  <th>Ko‘rinish</th>
                  <th>Amal</th>
                </tr>
              </thead>

              <tbody>
                {paginatedAuditThreads.map((thread, index) => (
                  <tr key={thread.id}>
                    <td>
                      {
                        (auditPage - 1)
                        * DEFAULT_PAGE_SIZE
                        + index
                        + 1
                      }
                    </td>

                    <td>
                      <div className="table-user">
                        <div className="mini-avatar">
                          <Stethoscope size={18} />
                        </div>
                        <div>
                          <strong>{fullName(thread.staff)}</strong>
                          <span>{staffSubtitle(thread.staff)}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="table-user">
                        <div className="mini-avatar chat-patient-avatar">
                          <UserRound size={18} />
                        </div>
                        <div>
                          <strong>{fullName(thread.patient)}</strong>
                          <span>{thread.patient.phone || thread.patient.email}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="chat-table-preview">
                        {thread.last_message?.is_deleted
                          ? 'Xabar o‘chirilgan'
                          : thread.last_message?.body || 'Xabar yozilmagan'
                        }
                      </div>
                    </td>

                    <td>
                      {formatDateTime(thread.last_message_at || thread.created_at)}
                    </td>

                    <td>
                      <span
                        className={
                          `status-badge ${
                            thread.hidden_for_staff || thread.hidden_for_patient
                              ? 'status-orange'
                              : 'status-green'
                          }`
                        }
                      >
                        {visibilityText(thread)}
                      </span>
                    </td>

                    <td>
                      <button
                        className="table-action-button"
                        type="button"
                        onClick={() => openThread(thread)}
                      >
                        Ko‘rish
                      </button>
                    </td>
                  </tr>
                ))}

                {!loadingThreads && threads.length === 0 && (
                  <tr>
                    <td colSpan="7" className="chat-table-empty">
                      Yozishmalar topilmadi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={auditPage}
            totalItems={threads.length}
            onPageChange={setAuditPage}
          />

        </div>
      ) : (
        <div className="chat-workspace">
          <aside className="chat-sidebar-panel">
            <div className="chat-sidebar-head">
              <div>
                <strong>Yozishmalar</strong>
                <span>{threads.length} ta suhbat</span>
              </div>

              <button
                type="button"
                onClick={loadThreads}
                title="Yangilash"
              >
                <RefreshCw size={18} />
              </button>
            </div>

            <div className="chat-search-box">
              <Search size={19} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Yozishmalardan qidirish..."
              />
            </div>

            <div className="chat-thread-list">
              {threads.map((thread) => {
                const person = user.role === 'PATIENT'
                  ? thread.staff
                  : thread.patient;

                return (
                  <button
                    key={thread.id}
                    type="button"
                    className={
                      `chat-thread-item ${
                        selectedThread?.id === thread.id
                          ? 'chat-thread-item-active'
                          : ''
                      }`
                    }
                    onClick={() => openThread(thread)}
                  >
                    <div className="chat-thread-avatar">
                      {user.role === 'PATIENT'
                        ? <Stethoscope size={21} />
                        : <UserRound size={21} />
                      }
                    </div>

                    <div className="chat-thread-content">
                      <div className="chat-thread-topline">
                        <strong>{fullName(person)}</strong>
                        <span>{shortDate(thread.last_message_at)}</span>
                      </div>

                      <div className="chat-thread-subtitle">
                        {user.role === 'PATIENT'
                          ? staffSubtitle(thread.staff)
                          : thread.patient.phone || thread.patient.email
                        }
                      </div>

                      <div className="chat-thread-preview-line">
                        <span>
                          {thread.last_message?.body || 'Yangi yozishma'}
                        </span>

                        {thread.unread_count > 0 && (
                          <b>{thread.unread_count}</b>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {!loadingThreads && threads.length === 0 && (
                <div className="chat-sidebar-empty">
                  Hozircha yozishmalar yo‘q.
                </div>
              )}
            </div>
          </aside>

          {chatPanel}
        </div>
      )}

      <Modal
        opened={isSupervisor && Boolean(selectedThread)}
        onClose={closeSupervisorChat}
        title={
          selectedThread
            ? `${fullName(selectedThread.staff)} ↔ ${fullName(selectedThread.patient)}`
            : 'Yozishma'
        }
        centered
        size="xl"
        radius="lg"
        classNames={{
          content: 'chat-supervisor-modal-content',
          header: 'chat-supervisor-modal-header',
          title: 'chat-supervisor-modal-title',
          body: 'chat-supervisor-modal-body',
        }}
        overlayProps={{
          backgroundOpacity: 0.48,
          blur: 3,
        }}
      >
        {selectedThread && (
          <div className="chat-supervisor-modal-shell">
            {chatPanel}
          </div>
        )}
      </Modal>

      <Modal
        opened={newChatOpened}
        onClose={() => setNewChatOpened(false)}
        title="Yangi yozishma"
        centered
        size="lg"
        radius="lg"
      >
        <div className="chat-patient-picker">
          <div className="chat-search-box">
            <Search size={18} />
            <input
              value={patientSearch}
              onChange={(event) => setPatientSearch(event.target.value)}
              placeholder="Bemorni ism, email yoki telefon bo‘yicha qidiring..."
            />
          </div>

          <div className="chat-patient-picker-list">
            {patients.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => openOrCreateThread(patient.id)}
              >
                <div className="mini-avatar">
                  <UserRound size={18} />
                </div>
                <div>
                  <strong>{fullName(patient)}</strong>
                  <span>
                    {patient.phone || patient.email}
                  </span>
                </div>
                <Send size={17} />
              </button>
            ))}

            {patients.length === 0 && (
              <div className="chat-sidebar-empty">
                Bemor topilmadi.
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        opened={Boolean(editMessage)}
        onClose={() => setEditMessage(null)}
        title="Xabarni tahrirlash"
        centered
        radius="lg"
      >
        <div className="chat-edit-modal">
          <textarea
            value={editText}
            onChange={(event) => setEditText(event.target.value)}
            maxLength={2000}
            rows={5}
          />

          <div className="chat-modal-actions">
            <button
              type="button"
              className="table-action-button"
              onClick={() => setEditMessage(null)}
            >
              Bekor qilish
            </button>

            <button
              type="button"
              className="primary-dashboard-button"
              onClick={saveEditedMessage}
              disabled={!editText.trim()}
            >
              Saqlash
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        opened={Boolean(deleteMessage)}
        onClose={() => setDeleteMessage(null)}
        title="Xabarni o‘chirish"
        centered
        radius="lg"
        size="sm"
      >
        <div className="chat-delete-modal">
          <p>
            Ushbu xabarni o‘chirmoqchimisiz? Audit uchun o‘zgarish tarixi bazada saqlanib qoladi.
          </p>

          <div className="chat-modal-actions">
            <button
              type="button"
              className="table-action-button"
              onClick={() => setDeleteMessage(null)}
            >
              Bekor qilish
            </button>

            <button
              type="button"
              className="chat-danger-button"
              onClick={confirmDeleteMessage}
            >
              <Trash2 size={16} />
              O‘chirish
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        opened={hideThreadOpened}
        onClose={() => setHideThreadOpened(false)}
        title="Yozishmani ro‘yxatdan olib tashlash"
        centered
        radius="lg"
        size="sm"
      >
        <div className="chat-delete-modal">
          <p>
            Yozishma faqat sizning ro‘yxatingizdan yashiriladi. Xabarlar va yozishma tarixi admin hamda superadmin auditida saqlanib qoladi.
          </p>

          <div className="chat-modal-actions">
            <button
              type="button"
              className="table-action-button"
              onClick={() => setHideThreadOpened(false)}
            >
              Bekor qilish
            </button>

            <button
              type="button"
              className="chat-danger-button"
              onClick={confirmHideThread}
            >
              <ArchiveX size={16} />
              Olib tashlash
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


export default MessagesPage;
