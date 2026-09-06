import re

from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken

from .models import DoctorType, User


def normalize_uzbek_phone(value):
    raw = str(value or "").strip()
    digits = re.sub(r"\D", "", raw)

    if digits.startswith("998"):
        digits = digits[3:]

    if len(digits) != 9:
        raise serializers.ValidationError(
            "Telefon raqam +998 XX XXX XX XX formatida bo‘lishi kerak."
        )

    return f"+998{digits}"


def phone_belongs_to_another_user(normalized_phone, exclude_user_id=None):
    queryset = User.objects.exclude(phone="")

    if exclude_user_id:
        queryset = queryset.exclude(pk=exclude_user_id)

    for user in queryset.only("id", "phone"):
        try:
            existing_phone = normalize_uzbek_phone(user.phone)
        except serializers.ValidationError:
            continue

        if existing_phone == normalized_phone:
            return True

    return False


class DoctorTypeSerializer(serializers.ModelSerializer):
    doctor_count = serializers.SerializerMethodField()

    class Meta:
        model = DoctorType
        fields = (
            "id",
            "name",
            "description",
            "is_active",
            "doctor_count",
            "created_at",
        )
        read_only_fields = (
            "id",
            "doctor_count",
            "created_at",
        )

    def get_doctor_count(self, obj):
        return obj.doctors.filter(role=User.Role.DOCTOR).count()

    def validate_name(self, value):
        value = value.strip()

        queryset = DoctorType.objects.filter(name__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                "Bunday nomdagi doktor turi allaqachon mavjud."
            )

        return value


class RegisterSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(required=True, allow_blank=False)
    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )
    password_confirm = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    class Meta:
        model = User
        fields = (
            "email",
            "first_name",
            "last_name",
            "phone",
            "password",
            "password_confirm",
        )

    def validate_phone(self, value):
        normalized_phone = normalize_uzbek_phone(value)

        if phone_belongs_to_another_user(normalized_phone):
            raise serializers.ValidationError(
                "Bu telefon raqam bilan akkaunt allaqachon mavjud."
            )

        return normalized_phone

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {
                    "password_confirm": "Parollar bir xil emas."
                }
            )

        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")

        user = User.objects.create_user(
            password=password,
            role=User.Role.PATIENT,
            **validated_data,
        )

        return user


class LoginSerializer(serializers.Serializer):
    # `login` is the current frontend field. `email` and `phone` are kept
    # as backwards-compatible aliases so an older frontend cannot break login.
    login = serializers.CharField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
        label="Email yoki telefon",
    )
    email = serializers.EmailField(
        required=False,
        allow_blank=True,
        write_only=True,
    )
    phone = serializers.CharField(
        required=False,
        allow_blank=True,
        write_only=True,
    )
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs):
        login_value = str(
            attrs.get("login")
            or attrs.get("email")
            or attrs.get("phone")
            or ""
        ).strip()
        password = attrs.get("password", "")

        if not login_value:
            raise serializers.ValidationError(
                {"login": "Email yoki telefon raqamni kiriting."}
            )

        user = None

        if "@" in login_value:
            candidate = User.objects.filter(
                email__iexact=login_value
            ).first()

            if candidate and candidate.check_password(password):
                user = candidate
        else:
            try:
                normalized_phone = normalize_uzbek_phone(login_value)
            except serializers.ValidationError as exc:
                raise AuthenticationFailed(
                    "Email/telefon yoki parol noto‘g‘ri."
                ) from exc

            # Old local/test data may contain the same phone in more than one
            # account. Match by both normalized phone and password. This keeps
            # phone login usable while still rejecting a genuinely ambiguous
            # account pair.
            matched_users = []

            for candidate in User.objects.exclude(phone=""):
                try:
                    candidate_phone = normalize_uzbek_phone(candidate.phone)
                except serializers.ValidationError:
                    continue

                if (
                    candidate_phone == normalized_phone
                    and candidate.check_password(password)
                ):
                    matched_users.append(candidate)

            if len(matched_users) == 1:
                user = matched_users[0]
            elif len(matched_users) > 1:
                raise AuthenticationFailed(
                    "Bu telefon raqam va parol bir nechta akkauntga mos keldi. "
                    "Admin orqali telefon raqamlarni ajrating."
                )

        if not user:
            raise AuthenticationFailed(
                "Email/telefon yoki parol noto‘g‘ri."
            )

        if not user.is_active:
            raise AuthenticationFailed(
                "Ushbu akkaunt faol emas."
            )

        refresh = RefreshToken.for_user(user)

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(
        source="get_role_display",
        read_only=True,
    )

    doctor_type = DoctorTypeSerializer(
        read_only=True,
    )

    profile_complete = serializers.BooleanField(
        read_only=True,
    )

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "role_display",
            "doctor_type",
            "profile_complete",
            "created_at",
        )

        read_only_fields = (
            "id",
            "email",
            "role",
            "doctor_type",
            "created_at",
        )

    def validate_phone(self, value):
        normalized_phone = normalize_uzbek_phone(value)
        user_id = self.instance.id if self.instance else None

        if phone_belongs_to_another_user(
            normalized_phone,
            exclude_user_id=user_id,
        ):
            raise serializers.ValidationError(
                "Bu telefon raqam boshqa akkauntga biriktirilgan."
            )

        return normalized_phone


class ManagementUserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(
        source="get_role_display",
        read_only=True,
    )

    doctor_type = DoctorTypeSerializer(
        read_only=True,
    )

    profile_complete = serializers.BooleanField(
        read_only=True,
    )

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "role_display",
            "doctor_type",
            "profile_complete",
            "created_at",
        )
