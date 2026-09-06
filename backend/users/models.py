from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email kiritilishi shart.")

        email = self.normalize_email(email)

        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)

        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", "SUPERADMIN")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser uchun is_staff=True bo‘lishi kerak.")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser uchun is_superuser=True bo‘lishi kerak.")

        return self.create_user(email, password, **extra_fields)


class DoctorType(models.Model):
    name = models.CharField(
        max_length=120,
        unique=True,
        verbose_name="Doktor turi nomi",
    )

    description = models.TextField(
        blank=True,
        verbose_name="Izoh",
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name="Faol",
    )

    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_doctor_types",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ("name",)
        verbose_name = "Doktor turi"
        verbose_name_plural = "Doktor turlari"

    def __str__(self):
        return self.name


class User(AbstractUser):
    class Role(models.TextChoices):
        PATIENT = "PATIENT", "Bemor"
        DOCTOR = "DOCTOR", "Doktor"
        ADMIN = "ADMIN", "Admin"
        SUPERADMIN = "SUPERADMIN", "Superadmin"

    class Gender(models.TextChoices):
        MALE = "MALE", "Erkak"
        FEMALE = "FEMALE", "Ayol"

    username = None

    email = models.EmailField(
        unique=True,
        verbose_name="Email",
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.PATIENT,
        verbose_name="Rol",
    )

    doctor_type = models.ForeignKey(
        DoctorType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="doctors",
        verbose_name="Doktor turi",
    )

    phone = models.CharField(
        max_length=30,
        blank=True,
        verbose_name="Telefon",
    )

    # Legacy fields are kept so existing local data is not lost.
    # New medical information is stored through the dynamic questionnaire.
    birth_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Tug‘ilgan sana",
    )

    gender = models.CharField(
        max_length=10,
        choices=Gender.choices,
        blank=True,
        verbose_name="Jins",
    )

    address = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Manzil",
    )

    disease = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Kasallik / murojaat sababi",
    )

    additional_info = models.TextField(
        blank=True,
        verbose_name="Qo‘shimcha ma’lumot",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    @property
    def profile_complete(self):
        return all(
            [
                self.email,
                self.first_name,
                self.last_name,
                self.phone,
            ]
        )

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"
