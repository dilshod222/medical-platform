from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import User

from .models import (
    ChatMessage,
    ChatMessageRevision,
    ChatThread,
)
from .serializers import (
    ChatMessageSerializer,
    ChatPatientSerializer,
    ChatThreadSerializer,
)


STAFF_MESSAGE_ROLES = (
    User.Role.DOCTOR,
    User.Role.ADMIN,
    User.Role.SUPERADMIN,
)


SUPERVISOR_ROLES = (
    User.Role.ADMIN,
    User.Role.SUPERADMIN,
)


def user_can_start_chat(user):
    return user.is_authenticated and user.role in STAFF_MESSAGE_ROLES


def base_threads_queryset():
    return ChatThread.objects.select_related(
        "patient",
        "staff",
        "staff__doctor_type",
    ).prefetch_related("messages")


def visible_threads_for(user):
    queryset = base_threads_queryset()

    if user.role == User.Role.PATIENT:
        return queryset.filter(
            patient=user,
            patient_hidden_at__isnull=True,
        )

    if user.role == User.Role.DOCTOR:
        return queryset.filter(
            staff=user,
            staff_hidden_at__isnull=True,
        )

    if user.role in SUPERVISOR_ROLES:
        # Audit view: hidden conversations are intentionally included.
        return queryset

    return queryset.none()


def get_visible_thread(user, pk):
    return get_object_or_404(
        visible_threads_for(user),
        pk=pk,
    )


class ChatThreadListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        scope = request.query_params.get("scope", "").strip().lower()

        if request.user.role in SUPERVISOR_ROLES and scope == "mine":
            queryset = base_threads_queryset().filter(
                staff=request.user,
                staff_hidden_at__isnull=True,
            )
        else:
            queryset = visible_threads_for(request.user)

        search = request.query_params.get("q", "").strip()

        if search:
            queryset = queryset.filter(
                Q(patient__first_name__icontains=search)
                | Q(patient__last_name__icontains=search)
                | Q(patient__email__icontains=search)
                | Q(patient__phone__icontains=search)
                | Q(staff__first_name__icontains=search)
                | Q(staff__last_name__icontains=search)
                | Q(staff__email__icontains=search)
                | Q(staff__doctor_type__name__icontains=search)
            )

        if request.user.role in SUPERVISOR_ROLES and scope != "mine":
            staff_q = request.query_params.get("staff_q", "").strip()
            patient_q = request.query_params.get("patient_q", "").strip()
            visibility = request.query_params.get("visibility", "all").strip()

            if staff_q:
                queryset = queryset.filter(
                    Q(staff__first_name__icontains=staff_q)
                    | Q(staff__last_name__icontains=staff_q)
                    | Q(staff__email__icontains=staff_q)
                    | Q(staff__phone__icontains=staff_q)
                    | Q(staff__doctor_type__name__icontains=staff_q)
                )

            if patient_q:
                queryset = queryset.filter(
                    Q(patient__first_name__icontains=patient_q)
                    | Q(patient__last_name__icontains=patient_q)
                    | Q(patient__email__icontains=patient_q)
                    | Q(patient__phone__icontains=patient_q)
                )

            if visibility == "active":
                queryset = queryset.filter(
                    staff_hidden_at__isnull=True,
                    patient_hidden_at__isnull=True,
                )
            elif visibility == "staff_hidden":
                queryset = queryset.filter(
                    staff_hidden_at__isnull=False,
                )
            elif visibility == "patient_hidden":
                queryset = queryset.filter(
                    patient_hidden_at__isnull=False,
                )
            elif visibility == "hidden_any":
                queryset = queryset.filter(
                    Q(staff_hidden_at__isnull=False)
                    | Q(patient_hidden_at__isnull=False)
                )

        queryset = queryset.order_by(
            "-last_message_at",
            "-updated_at",
        )

        serializer = ChatThreadSerializer(
            queryset,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)

    def post(self, request):
        if not user_can_start_chat(request.user):
            return Response(
                {
                    "detail": "Yangi yozishmani faqat doktor, admin yoki superadmin boshlashi mumkin."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        patient_id = request.data.get("patient_id")

        if not patient_id:
            return Response(
                {"detail": "Bemorni tanlang."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        patient = get_object_or_404(
            User,
            pk=patient_id,
            role=User.Role.PATIENT,
            is_active=True,
        )

        thread, _ = ChatThread.objects.get_or_create(
            patient=patient,
            staff=request.user,
        )

        # Doktor ilgari o‘z ro‘yxatidan yashirgan bo‘lsa, qayta ochiladi.
        if thread.staff_hidden_at is not None:
            thread.staff_hidden_at = None
            thread.save(update_fields=("staff_hidden_at", "updated_at"))

        serializer = ChatThreadSerializer(
            thread,
            context={"request": request},
        )
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


class ChatThreadDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def delete(self, request, pk):
        # Audit qiluvchi admin/superadmin yozishmani global bazadan o‘chirmaydi.
        if request.user.role in SUPERVISOR_ROLES:
            return Response(
                {
                    "detail": "Admin va superadmin audit yozishmalarini yashira olmaydi."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        thread = get_visible_thread(request.user, pk)

        if request.user.id == thread.patient_id:
            thread.patient_hidden_at = timezone.now()
            thread.save(update_fields=("patient_hidden_at", "updated_at"))
        elif request.user.id == thread.staff_id:
            thread.staff_hidden_at = timezone.now()
            thread.save(update_fields=("staff_hidden_at", "updated_at"))
        else:
            return Response(
                {"detail": "Bu yozishmani yashirishga ruxsat yo‘q."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class ChatUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        queryset = ChatMessage.objects.filter(
            is_deleted=False,
            is_read=False,
        ).exclude(sender=user)

        if user.role == User.Role.PATIENT:
            queryset = queryset.filter(
                thread__patient=user,
                thread__patient_hidden_at__isnull=True,
            )
        elif user.role in STAFF_MESSAGE_ROLES:
            queryset = queryset.filter(
                thread__staff=user,
                thread__staff_hidden_at__isnull=True,
            )
        else:
            return Response({"unread_count": 0})

        return Response({"unread_count": queryset.count()})


class ChatAvailablePatientsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not user_can_start_chat(request.user):
            return Response(
                {"detail": "Ruxsat yo‘q."},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = User.objects.filter(
            role=User.Role.PATIENT,
            is_active=True,
        ).order_by("first_name", "last_name", "id")

        search = request.query_params.get("q", "").strip()

        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
            )

        serializer = ChatPatientSerializer(
            queryset[:100],
            many=True,
        )
        return Response(serializer.data)


class ChatThreadMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        thread = get_visible_thread(request.user, pk)

        # Oddiy chat oynasida real ishtirokchi qarshi tomondan kelgan
        # xabarlarni o‘qilgan deb belgilaydi. Audit oynasi statusni o‘zgartirmaydi.
        audit_mode = request.query_params.get("audit", "").strip() == "1"

        if (
            not audit_mode
            and request.user.id in (thread.patient_id, thread.staff_id)
        ):
            now = timezone.now()
            thread.messages.filter(
                is_deleted=False,
                is_read=False,
            ).exclude(sender=request.user).update(
                is_read=True,
                read_at=now,
                updated_at=now,
            )

        queryset = thread.messages.select_related(
            "sender",
            "sender__doctor_type",
        )

        if request.user.role not in SUPERVISOR_ROLES:
            queryset = queryset.filter(is_deleted=False)

        serializer = ChatMessageSerializer(
            queryset.order_by("created_at", "id"),
            many=True,
            context={"request": request},
        )

        return Response(
            {
                "thread": ChatThreadSerializer(
                    thread,
                    context={"request": request},
                ).data,
                "messages": serializer.data,
            }
        )

    @transaction.atomic
    def post(self, request, pk):
        thread = get_visible_thread(request.user, pk)

        if request.user.id not in (
            thread.staff_id,
            thread.patient_id,
        ):
            return Response(
                {"detail": "Bu yozishmada xabar yuborishga ruxsat yo‘q."},
                status=status.HTTP_403_FORBIDDEN,
            )

        body = str(request.data.get("body", "")).strip()

        if not body:
            return Response(
                {"detail": "Xabar matnini kiriting."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(body) > 2000:
            return Response(
                {"detail": "Xabar 2000 belgidan oshmasligi kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = ChatMessage.objects.create(
            thread=thread,
            sender=request.user,
            body=body,
        )

        update_fields = ["last_message_at", "updated_at"]
        thread.last_message_at = message.created_at

        # Yangi xabar kelishi bilan qarshi tomon ilgari yashirgan yozishma
        # uning ro‘yxatida yana paydo bo‘ladi.
        if request.user.id == thread.staff_id:
            if thread.patient_hidden_at is not None:
                thread.patient_hidden_at = None
                update_fields.append("patient_hidden_at")
        else:
            if thread.staff_hidden_at is not None:
                thread.staff_hidden_at = None
                update_fields.append("staff_hidden_at")

        thread.save(update_fields=tuple(update_fields))

        serializer = ChatMessageSerializer(
            message,
            context={"request": request},
        )
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


class ChatMessageDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_message(self, request, pk):
        message = get_object_or_404(
            ChatMessage.objects.select_related(
                "thread",
                "thread__patient",
                "thread__staff",
                "sender",
                "sender__doctor_type",
            ),
            pk=pk,
        )

        get_visible_thread(
            request.user,
            message.thread_id,
        )
        return message

    def _can_manage(self, user, message):
        return (
            message.sender_id == user.id
            or user.role in SUPERVISOR_ROLES
        )

    @transaction.atomic
    def patch(self, request, pk):
        message = self._get_message(request, pk)

        if not self._can_manage(request.user, message):
            return Response(
                {"detail": "Bu xabarni tahrirlashga ruxsat yo‘q."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if message.is_deleted:
            return Response(
                {"detail": "O‘chirilgan xabarni tahrirlab bo‘lmaydi."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        body = str(request.data.get("body", "")).strip()

        if not body:
            return Response(
                {"detail": "Xabar matnini kiriting."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(body) > 2000:
            return Response(
                {"detail": "Xabar 2000 belgidan oshmasligi kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if body != message.body:
            ChatMessageRevision.objects.create(
                message=message,
                previous_body=message.body,
                action=ChatMessageRevision.Action.EDIT,
                changed_by=request.user,
            )

            message.body = body
            message.edited_at = timezone.now()
            message.save(
                update_fields=(
                    "body",
                    "edited_at",
                    "updated_at",
                )
            )

        serializer = ChatMessageSerializer(
            message,
            context={"request": request},
        )
        return Response(serializer.data)

    @transaction.atomic
    def delete(self, request, pk):
        message = self._get_message(request, pk)

        if not self._can_manage(request.user, message):
            return Response(
                {"detail": "Bu xabarni o‘chirishga ruxsat yo‘q."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if message.is_deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)

        ChatMessageRevision.objects.create(
            message=message,
            previous_body=message.body,
            action=ChatMessageRevision.Action.DELETE,
            changed_by=request.user,
        )

        now = timezone.now()
        message.is_deleted = True
        message.deleted_at = now
        message.deleted_by = request.user
        message.save(
            update_fields=(
                "is_deleted",
                "deleted_at",
                "deleted_by",
                "updated_at",
            )
        )

        latest = message.thread.messages.filter(
            is_deleted=False,
        ).order_by("-created_at", "-id").first()

        message.thread.last_message_at = (
            latest.created_at if latest else None
        )
        message.thread.save(
            update_fields=(
                "last_message_at",
                "updated_at",
            )
        )

        return Response(status=status.HTTP_204_NO_CONTENT)
