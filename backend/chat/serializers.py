from rest_framework import serializers

from users.models import User

from .models import ChatMessage, ChatThread


class ChatUserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(
        source="get_role_display",
        read_only=True,
    )
    doctor_type_name = serializers.CharField(
        source="doctor_type.name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = (
            "id",
            "first_name",
            "last_name",
            "email",
            "phone",
            "role",
            "role_display",
            "doctor_type_name",
        )


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = ChatUserSerializer(read_only=True)
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = (
            "id",
            "thread",
            "sender",
            "body",
            "is_read",
            "read_at",
            "is_deleted",
            "edited_at",
            "created_at",
            "updated_at",
            "can_edit",
            "can_delete",
        )
        read_only_fields = (
            "id",
            "thread",
            "sender",
            "is_read",
            "read_at",
            "is_deleted",
            "edited_at",
            "created_at",
            "updated_at",
            "can_edit",
            "can_delete",
        )

    def get_can_edit(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False

        user = request.user
        return (
            not obj.is_deleted
            and (
                obj.sender_id == user.id
                or user.role in (
                    User.Role.ADMIN,
                    User.Role.SUPERADMIN,
                )
            )
        )

    def get_can_delete(self, obj):
        return self.get_can_edit(obj)


class ChatThreadSerializer(serializers.ModelSerializer):
    patient = ChatUserSerializer(read_only=True)
    staff = ChatUserSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    can_send = serializers.SerializerMethodField()
    can_hide = serializers.SerializerMethodField()
    hidden_for_staff = serializers.SerializerMethodField()
    hidden_for_patient = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatThread
        fields = (
            "id",
            "patient",
            "staff",
            "created_at",
            "updated_at",
            "last_message_at",
            "last_message",
            "unread_count",
            "can_send",
            "can_hide",
            "hidden_for_staff",
            "hidden_for_patient",
            "message_count",
        )

    def get_last_message(self, obj):
        queryset = obj.messages.filter(is_deleted=False)
        message = queryset.order_by("-created_at", "-id").first()

        if not message:
            return None

        return ChatMessageSerializer(
            message,
            context=self.context,
        ).data

    def get_unread_count(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return 0

        user = request.user

        if user.id not in (obj.patient_id, obj.staff_id):
            return 0

        return obj.messages.filter(
            is_deleted=False,
            is_read=False,
        ).exclude(sender=user).count()

    def get_can_send(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return request.user.id in (
            obj.patient_id,
            obj.staff_id,
        )

    def get_can_hide(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        # Admin/superadmin audit ro‘yxatidan yozishma yashirilmaydi.
        if request.user.role in (
            User.Role.ADMIN,
            User.Role.SUPERADMIN,
        ):
            return False

        return request.user.id in (
            obj.patient_id,
            obj.staff_id,
        )

    def get_hidden_for_staff(self, obj):
        return obj.staff_hidden_at is not None

    def get_hidden_for_patient(self, obj):
        return obj.patient_hidden_at is not None

    def get_message_count(self, obj):
        return obj.messages.count()


class ChatPatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "first_name",
            "last_name",
            "email",
            "phone",
        )
