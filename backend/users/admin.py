from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import DoctorType, User


@admin.register(DoctorType)
class DoctorTypeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "is_active",
        "created_at",
    )
    list_filter = ("is_active",)
    search_fields = ("name", "description")
    ordering = ("name",)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User

    list_display = (
        "id",
        "email",
        "first_name",
        "last_name",
        "role",
        "doctor_type",
        "is_active",
        "is_staff",
        "created_at",
    )

    list_filter = (
        "role",
        "doctor_type",
        "is_active",
        "is_staff",
        "is_superuser",
    )

    ordering = ("-created_at",)

    search_fields = (
        "email",
        "first_name",
        "last_name",
        "phone",
    )

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "email",
                    "password",
                )
            },
        ),
        (
            "Registratsiya ma'lumotlari",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "phone",
                )
            },
        ),
        (
            "Tizimdagi rol",
            {
                "fields": (
                    "role",
                    "doctor_type",
                )
            },
        ),
        (
            "Django huquqlari",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Muhim sanalar",
            {
                "fields": (
                    "last_login",
                    "date_joined",
                )
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "phone",
                    "role",
                    "doctor_type",
                    "password1",
                    "password2",
                    "is_staff",
                    "is_active",
                ),
            },
        ),
    )
