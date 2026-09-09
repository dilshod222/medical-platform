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
        trim_whitespace=False,
        allow_blank=False,
    )
    password_confirm = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        allow_blank=False,
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
    login = serializers.CharField(
        trim_whitespace=True,
        label="Email yoki telefon",
    )
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs):
        login_value = attrs.get("login", "").strip()
        password = attrs.get("password", "")

        user = None

        if "@" in login_value:
            user = User.objects.filter(
                email__iexact=login_value
            ).first()
        else:
            try:
                normalized_phone = normalize_uzbek_phone(login_value)
            except serializers.ValidationError as exc:
                raise AuthenticationFailed(
                    "Email yoki telefon raqam noto‘g‘ri."
                ) from exc

            matched_users = []

            for candidate in User.objects.exclude(phone="").only(
                "id",
                "phone",
            ):
                try:
                    candidate_phone = normalize_uzbek_phone(candidate.phone)
                except serializers.ValidationError:
                    continue

                if candidate_phone == normalized_phone:
                    matched_users.append(candidate.id)

            if len(matched_users) == 1:
                user = User.objects.filter(pk=matched_users[0]).first()
            elif len(matched_users) > 1:
                raise AuthenticationFailed(
                    "Bu telefon raqam bir nechta akkauntga biriktirilgan. Admin bilan bog‘laning."
                )

        if not user or not user.check_password(password):
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
            "role",
            "doctor_type",
            "created_at",
        )

    def validate_email(self, value):
        normalized_email = User.objects.normalize_email(
            value.strip()
        )

        user_id = (
            self.instance.id
            if self.instance
            else None
        )

        queryset = User.objects.filter(
            email__iexact=normalized_email
        )

        if user_id:
            queryset = queryset.exclude(
                pk=user_id
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "Bu email manzil boshqa akkauntga biriktirilgan."
            )

        return normalized_email

    def validate_phone(self, value):
        normalized_phone = normalize_uzbek_phone(
            value
        )

        user_id = (
            self.instance.id
            if self.instance
            else None
        )

        if phone_belongs_to_another_user(
            normalized_phone,
            exclude_user_id=user_id,
        ):
            raise serializers.ValidationError(
                "Bu telefon raqam boshqa akkauntga biriktirilgan."
            )

        return normalized_phone


class LoginCredentialsUpdateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    phone = serializers.CharField(
        required=True,
        allow_blank=False,
    )

    def validate_email(self, value):
        normalized_email = User.objects.normalize_email(
            value.strip()
        )
        user = self.context["request"].user

        if User.objects.filter(
            email__iexact=normalized_email
        ).exclude(pk=user.pk).exists():
            raise serializers.ValidationError(
                "Bu email manzil boshqa akkauntga biriktirilgan."
            )

        return normalized_email

    def validate_phone(self, value):
        normalized_phone = normalize_uzbek_phone(value)
        user = self.context["request"].user

        if phone_belongs_to_another_user(
            normalized_phone,
            exclude_user_id=user.pk,
        ):
            raise serializers.ValidationError(
                "Bu telefon raqam boshqa akkauntga biriktirilgan."
            )

        return normalized_phone

    def update(self, instance, validated_data):
        instance.email = validated_data["email"]
        instance.phone = validated_data["phone"]
        instance.save()

        return instance


class PasswordChangeSerializer(serializers.Serializer):
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        allow_blank=False,
    )

    new_password_confirm = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        allow_blank=False,
    )

    def validate(self, attrs):
        new_password = attrs["new_password"]
        new_password_confirm = attrs["new_password_confirm"]

        if new_password != new_password_confirm:
            raise serializers.ValidationError(
                {
                    "new_password_confirm":
                        "Yangi parollar bir xil emas."
                }
            )

        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user

        user.set_password(
            self.validated_data["new_password"]
        )
        user.save(update_fields=["password"])

        return user


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
