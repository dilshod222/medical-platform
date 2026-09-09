import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { notifications } from '@mantine/notifications';
import {
  useNavigate,
  useOutletContext,
} from 'react-router-dom';
import {
  Eye,
  MessageSquareText,
  Search,
  ShieldCheck,
  UserCog,
} from 'lucide-react';

import api from '../api/client';
import MedicalInfoModal from '../components/MedicalInfoModal';
import TablePagination, {
  DEFAULT_PAGE_SIZE,
} from '../components/TablePagination';


function UsersPage() {
  const { user: currentUser } = useOutletContext();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [doctorTypes, setDoctorTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [draftRoles, setDraftRoles] = useState({});
  const [draftDoctorTypes, setDraftDoctorTypes] = useState({});
  const [medicalUserId, setMedicalUserId] = useState(null);


  async function loadUsers() {
    try {
      const response = await api.get(
        '/management/users/'
      );

      setUsers(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch {
      setUsers([]);
    }
  }


  async function loadDoctorTypes() {
    try {
      const response = await api.get(
        '/doctor-types/'
      );

      setDoctorTypes(
        Array.isArray(response.data)
          ? response.data.filter(
              (item) => item.is_active
            )
          : []
      );
    } catch {
      setDoctorTypes([]);
    }
  }


  useEffect(() => {
    if (
      currentUser.role === 'ADMIN'
      || currentUser.role === 'SUPERADMIN'
    ) {
      loadUsers();
    }
  }, [currentUser.role]);


  useEffect(() => {
    if (
      currentUser.role === 'ADMIN'
      || currentUser.role === 'SUPERADMIN'
    ) {
      loadDoctorTypes();
    }
  }, [currentUser.role]);


  useEffect(() => {
    setCurrentPage(1);
  }, [search]);


  const filteredUsers = useMemo(
    () => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) {
        return users;
      }

      return users.filter(
        (target) => {
          const haystack = [
            target.first_name,
            target.last_name,
            target.email,
            target.phone,
            target.role,
            target.role_display,
            target.doctor_type?.name,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return haystack.includes(query);
        }
      );
    },
    [users, search]
  );


  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredUsers.length
      / DEFAULT_PAGE_SIZE
    )
  );


  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);


  const paginatedUsers = useMemo(
    () => {
      const start = (
        currentPage - 1
      ) * DEFAULT_PAGE_SIZE;

      return filteredUsers.slice(
        start,
        start + DEFAULT_PAGE_SIZE
      );
    },
    [filteredUsers, currentPage]
  );


  function canEditRole(target) {
    return (
      currentUser.role === 'SUPERADMIN'
      && target.id !== currentUser.id
      && target.role !== 'SUPERADMIN'
    );
  }


  function selectedRole(target) {
    return (
      draftRoles[target.id]
      || target.role
    );
  }


  function selectedDoctorType(target) {
    return (
      draftDoctorTypes[target.id]
      ?? target.doctor_type?.id
      ?? ''
    );
  }


  function changeRole(target, role) {
    setDraftRoles((current) => ({
      ...current,
      [target.id]: role,
    }));

    if (
      role === 'DOCTOR'
      && !selectedDoctorType(target)
      && doctorTypes.length > 0
    ) {
      setDraftDoctorTypes((current) => ({
        ...current,
        [target.id]: doctorTypes[0].id,
      }));
    }
  }


  function hasRoleChanges(target) {
    const role = selectedRole(target);

    if (role !== target.role) {
      return true;
    }

    if (role === 'DOCTOR') {
      return String(
        selectedDoctorType(target) || ''
      ) !== String(
        target.doctor_type?.id || ''
      );
    }

    return false;
  }


  async function saveRole(target) {
    const role = selectedRole(target);
    const payload = { role };

    if (role === 'DOCTOR') {
      const doctorTypeId = (
        selectedDoctorType(target)
      );

      if (!doctorTypeId) {
        notifications.show({
          title: 'Doktor turini tanlang',
          message:
            'Doctor roli uchun doktor turi majburiy.',
          color: 'orange',
        });

        return;
      }

      payload.doctor_type_id = Number(
        doctorTypeId
      );
    }

    try {
      await api.patch(
        `/management/users/${target.id}/role/`,
        payload
      );

      notifications.show({
        title: 'Rol yangilandi',
        message:
          'Foydalanuvchining roli muvaffaqiyatli saqlandi.',
        color: 'green',
      });

      setDraftRoles((current) => {
        const next = { ...current };
        delete next[target.id];
        return next;
      });

      setDraftDoctorTypes((current) => {
        const next = { ...current };
        delete next[target.id];
        return next;
      });

      await loadUsers();
    } catch (error) {
      notifications.show({
        title: 'Xatolik',
        message:
          error.response?.data?.detail
          || 'Rolni o‘zgartirib bo‘lmadi.',
        color: 'red',
      });
    }
  }


  if (
    currentUser.role !== 'ADMIN'
    && currentUser.role !== 'SUPERADMIN'
  ) {
    return (
      <div className="permission-error">
        Ushbu sahifaga kirishga ruxsat yo‘q.
      </div>
    );
  }


  return (
    <div className="page-content">
      <div className="section-heading">
        <span className="page-kicker">
          FOYDALANUVCHILARNI BOSHQARISH
        </span>

        <h1>Foydalanuvchilar</h1>

        <p>
          Barcha foydalanuvchilar ro‘yxati va ularning tibbiy
          ma’lumotlarini ko‘ring. Rollarni faqat Superadmin tayinlaydi.
        </p>
      </div>


      <div className="content-card">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={19} />

            <input
              value={search}
              onChange={(event) => {
                setSearch(
                  event.target.value
                );
              }}
              placeholder="Foydalanuvchi qidirish..."
            />
          </div>

          <div className="table-count">
            Jami foydalanuvchi: {users.length}
            {search && (
              <> · Topildi: {filteredUsers.length}</>
            )}
          </div>
        </div>


        <div className="dashboard-table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>T/R</th>
                <th>Foydalanuvchi</th>
                <th>Telefon</th>
                <th>Joriy rol</th>
                <th>Tibbiy ma’lumot</th>
                <th>Xabar</th>
                <th>Yangi rol</th>
                <th>Doktor turi</th>
                <th>Saqlash</th>
              </tr>
            </thead>

            <tbody>
              {paginatedUsers.map(
                (target, index) => {
                  const editable = (
                    canEditRole(target)
                  );

                  const role = (
                    selectedRole(target)
                  );

                  const changed = (
                    hasRoleChanges(target)
                  );

                  return (
                    <tr key={target.id}>
                      <td>
                        {
                          (
                            currentPage - 1
                          )
                          * DEFAULT_PAGE_SIZE
                          + index
                          + 1
                        }
                      </td>

                      <td>
                        <div className="table-user">
                          <div className="mini-avatar">
                            <UserCog size={18} />
                          </div>

                          <div>
                            <strong>
                              {target.first_name || 'Ismsiz'}{' '}
                              {target.last_name || ''}
                            </strong>

                            <span>
                              {target.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        {target.phone || '—'}
                      </td>

                      <td>
                        <span className="role-table-badge">
                          <ShieldCheck size={14} />
                          {target.role_display}

                          {target.doctor_type && (
                            <>
                              {' / '}
                              {target.doctor_type.name}
                            </>
                          )}
                        </span>
                      </td>

                      <td>
                        <button
                          className="table-action-button table-medical-button"
                          type="button"
                          onClick={() => {
                            setMedicalUserId(
                              target.id
                            );
                          }}
                        >
                          <Eye size={15} />
                          Ko‘rish
                        </button>
                      </td>

                      <td>
                        {target.role === 'PATIENT' ? (
                          <button
                            className="table-action-button"
                            type="button"
                            onClick={() => {
                              navigate(
                                `/dashboard/messages?patient=${target.id}`
                              );
                            }}
                          >
                            <MessageSquareText size={15} />
                            Yozish
                          </button>
                        ) : (
                          <span className="table-muted">
                            —
                          </span>
                        )}
                      </td>

                      <td>
                        <select
                          className="role-select"
                          disabled={!editable}
                          value={role}
                          onChange={(event) => {
                            changeRole(
                              target,
                              event.target.value
                            );
                          }}
                        >
                          <option value="PATIENT">
                            Bemor
                          </option>

                          <option value="DOCTOR">
                            Doctor
                          </option>

                          <option value="ADMIN">
                            Admin
                          </option>

                          {target.role === 'SUPERADMIN' && (
                            <option value="SUPERADMIN">
                              Superadmin
                            </option>
                          )}
                        </select>
                      </td>

                      <td>
                        {role === 'DOCTOR' ? (
                          <select
                            className="role-select"
                            disabled={!editable}
                            value={
                              selectedDoctorType(
                                target
                              )
                            }
                            onChange={(event) => {
                              setDraftDoctorTypes(
                                (current) => ({
                                  ...current,
                                  [target.id]:
                                    event.target.value,
                                })
                              );
                            }}
                          >
                            <option value="">
                              Tanlang
                            </option>

                            {doctorTypes.map(
                              (doctorType) => (
                                <option
                                  key={doctorType.id}
                                  value={doctorType.id}
                                >
                                  {doctorType.name}
                                </option>
                              )
                            )}
                          </select>
                        ) : (
                          <span className="table-muted">
                            —
                          </span>
                        )}
                      </td>

                      <td>
                        <button
                          className="table-action-button"
                          disabled={
                            !editable
                            || !changed
                          }
                          onClick={() => {
                            saveRole(target);
                          }}
                          type="button"
                        >
                          Saqlash
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}

              {paginatedUsers.length === 0 && (
                <tr>
                  <td
                    colSpan="9"
                    style={{
                      textAlign: 'center',
                      padding: 28,
                    }}
                  >
                    Foydalanuvchi topilmadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>


        <TablePagination
          currentPage={currentPage}
          totalItems={filteredUsers.length}
          onPageChange={setCurrentPage}
        />
      </div>


      <MedicalInfoModal
        opened={Boolean(medicalUserId)}
        onClose={() => {
          setMedicalUserId(null);
        }}
        userId={medicalUserId}
      />
    </div>
  );
}


export default UsersPage;
