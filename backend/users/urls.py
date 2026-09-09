from django.urls import path

from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    DoctorPatientListView,
    DoctorTypeDetailView,
    DoctorTypeListCreateView,
    LoginCredentialsUpdateView,
    LoginView,
    ManagementRoleUpdateView,
    ManagementUserListView,
    MeView,
    PasswordChangeView,
    RegisterView,
)


urlpatterns = [
    path(
        "auth/register/",
        RegisterView.as_view(),
        name="register",
    ),
    path(
        "auth/login/",
        LoginView.as_view(),
        name="login",
    ),
    path(
        "auth/refresh/",
        TokenRefreshView.as_view(),
        name="token-refresh",
    ),
    path(
        "users/me/",
        MeView.as_view(),
        name="me",
    ),
    path(
        "users/me/login/",
        LoginCredentialsUpdateView.as_view(),
        name="me-login-update",
    ),
    path(
        "users/me/password/",
        PasswordChangeView.as_view(),
        name="me-password-change",
    ),
    path(
        "doctor/patients/",
        DoctorPatientListView.as_view(),
        name="doctor-patients",
    ),
    path(
        "management/users/",
        ManagementUserListView.as_view(),
        name="management-users",
    ),
    path(
        "management/users/<int:pk>/role/",
        ManagementRoleUpdateView.as_view(),
        name="management-role-update",
    ),
    path(
        "doctor-types/",
        DoctorTypeListCreateView.as_view(),
        name="doctor-type-list-create",
    ),
    path(
        "doctor-types/<int:pk>/",
        DoctorTypeDetailView.as_view(),
        name="doctor-type-detail",
    ),
]
