from rest_framework.permissions import BasePermission

from .models import User


class IsAdminOrSuperAdmin(BasePermission):
    message = "Ushbu amal uchun Admin huquqi talab qilinadi."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        return request.user.role in (
            User.Role.ADMIN,
            User.Role.SUPERADMIN,
        )


class IsSuperAdmin(BasePermission):
    message = "Ushbu amalni faqat Superadmin bajarishi mumkin."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        return request.user.role == User.Role.SUPERADMIN


class IsDoctor(BasePermission):
    message = "Ushbu sahifaga faqat doktor yoki Superadmin kira oladi."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.role == User.Role.SUPERADMIN:
            return True

        return (
            request.user.role == User.Role.DOCTOR
            and request.user.doctor_type_id is not None
        )
