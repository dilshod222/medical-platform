import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import ProtectedRoute
  from './components/ProtectedRoute';

import IdleSessionGuard
  from './components/IdleSessionGuard';

import DashboardLayout
  from './layouts/DashboardLayout';

import DoctorTypesPage
  from './pages/DoctorTypesPage';

import LoginPage
  from './pages/LoginPage';

import MedicalInfoPage
  from './pages/MedicalInfoPage';

import MessagesPage
  from './pages/MessagesPage';

import PatientsPage
  from './pages/PatientsPage';

import ProfilePage
  from './pages/ProfilePage';

import QuestionsPage
  from './pages/QuestionsPage';

import RegisterPage
  from './pages/RegisterPage';

import UsersPage
  from './pages/UsersPage';

import {
  hasAuthTokens,
} from './auth/tokenStorage';


function HomeRedirect() {
  return (
    <Navigate
      to={
        hasAuthTokens()
          ? '/dashboard'
          : '/login'
      }
      replace
    />
  );
}


function App() {
  return (
    <>
      {/*
        MUHIM:

        IdleSessionGuard <Routes> ichida EMAS.

        Routes bilan bir darajada,
        Fragment ichida turadi.
      */}
      <IdleSessionGuard />


      <Routes>

        <Route
          path="/"
          element={<HomeRedirect />}
        />


        <Route
          path="/login"
          element={<LoginPage />}
        />


        <Route
          path="/register"
          element={<RegisterPage />}
        />


        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >

          <Route
            index
            element={<ProfilePage />}
          />


          <Route
            path="medical"
            element={<MedicalInfoPage />}
          />


          <Route
            path="messages"
            element={<MessagesPage />}
          />


          {/*
            Eski URL qolib ketgan bo‘lsa
            Xabarlar sahifasiga qaytaramiz.
          */}
          <Route
            path="message-audit"
            element={
              <Navigate
                to="/dashboard/messages"
                replace
              />
            }
          />


          <Route
            path="patients"
            element={<PatientsPage />}
          />


          <Route
            path="users"
            element={<UsersPage />}
          />


          <Route
            path="doctor-types"
            element={<DoctorTypesPage />}
          />


          <Route
            path="questions"
            element={<QuestionsPage />}
          />

        </Route>


        <Route
          path="*"
          element={<HomeRedirect />}
        />

      </Routes>
    </>
  );
}


export default App;