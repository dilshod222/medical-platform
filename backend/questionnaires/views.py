from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission, IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response
from rest_framework.serializers import DateField
from rest_framework.views import APIView

from users.models import User

from .models import Question, QuestionAnswer
from .serializers import QuestionSerializer


class QuestionPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return True

        return request.user.role == User.Role.SUPERADMIN


class QuestionViewSet(viewsets.ModelViewSet):
    serializer_class = QuestionSerializer
    permission_classes = [QuestionPermission]

    def get_queryset(self):
        queryset = Question.objects.prefetch_related(
            "options"
        ).all()

        if self.request.user.role != User.Role.SUPERADMIN:
            queryset = queryset.filter(is_active=True)

        return queryset

    @action(detail=False, methods=["post"], url_path="reorder")
    @transaction.atomic
    def reorder(self, request):
        if request.user.role != User.Role.SUPERADMIN:
            return Response(
                {"detail": "Savollar tartibini faqat Superadmin o‘zgartira oladi."},
                status=status.HTTP_403_FORBIDDEN,
            )

        question_ids = request.data.get("question_ids")

        if not isinstance(question_ids, list) or not question_ids:
            return Response(
                {"detail": "question_ids bo‘sh bo‘lmagan ro‘yxat bo‘lishi kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            normalized_ids = [int(item) for item in question_ids]
        except (TypeError, ValueError):
            return Response(
                {"detail": "question_ids faqat raqamlardan iborat bo‘lishi kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(normalized_ids) != len(set(normalized_ids)):
            return Response(
                {"detail": "Savol IDlari takrorlanmasligi kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_ids = list(
            Question.objects.order_by("order", "id").values_list("id", flat=True)
        )

        if set(normalized_ids) != set(existing_ids):
            return Response(
                {
                    "detail": (
                        "Tartiblashda barcha mavjud savollar yuborilishi kerak. "
                        "Sahifani yangilab qayta urinib ko‘ring."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        for order, question_id in enumerate(normalized_ids):
            Question.objects.filter(pk=question_id).update(order=order)

        serializer = self.get_serializer(
            Question.objects.prefetch_related("options").order_by("order", "id"),
            many=True,
        )

        return Response(serializer.data)


class MedicalQuestionnaireView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            build_medical_payload(request.user)
        )

    @transaction.atomic
    def put(self, request):
        return self._save_answers(request)

    @transaction.atomic
    def patch(self, request):
        return self._save_answers(request)

    def _save_answers(self, request):
        answers = request.data.get("answers")

        if not isinstance(answers, list):
            return Response(
                {
                    "detail": "answers ro‘yxat ko‘rinishida yuborilishi kerak."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        active_questions = {
            question.id: question
            for question in Question.objects.filter(
                is_active=True
            ).prefetch_related("options")
        }

        errors = {}

        for item in answers:
            if not isinstance(item, dict):
                continue

            question_id = item.get("question")
            question = active_questions.get(question_id)

            if not question:
                errors[str(question_id)] = "Savol topilmadi yoki faol emas."
                continue

            try:
                normalized_value = normalize_answer(
                    question,
                    item.get("value"),
                )
            except ValueError as exc:
                errors[str(question_id)] = str(exc)
                continue

            if is_empty_answer(normalized_value):
                QuestionAnswer.objects.filter(
                    user=request.user,
                    question=question,
                ).delete()
            else:
                QuestionAnswer.objects.update_or_create(
                    user=request.user,
                    question=question,
                    defaults={
                        "value": normalized_value,
                    },
                )

        if errors:
            transaction.set_rollback(True)
            return Response(
                {
                    "detail": "Ayrim javoblarda xatolik bor.",
                    "errors": errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            build_medical_payload(request.user)
        )


class MedicalUserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        target_user = get_object_or_404(
            User.objects.select_related("doctor_type"),
            pk=pk,
        )

        if not can_view_other_medical_data(
            request.user,
            target_user,
        ):
            return Response(
                {
                    "detail": "Ushbu foydalanuvchining tibbiy ma’lumotlarini ko‘rishga ruxsat yo‘q."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        payload = build_medical_payload(target_user)
        payload["user"] = {
            "id": target_user.id,
            "email": target_user.email,
            "first_name": target_user.first_name,
            "last_name": target_user.last_name,
            "phone": target_user.phone,
            "role": target_user.role,
            "role_display": target_user.get_role_display(),
            "doctor_type": (
                {
                    "id": target_user.doctor_type.id,
                    "name": target_user.doctor_type.name,
                }
                if target_user.doctor_type
                else None
            ),
        }

        return Response(payload)


def can_view_other_medical_data(actor, target_user):
    if actor.id == target_user.id:
        return True

    if actor.role in (
        User.Role.ADMIN,
        User.Role.SUPERADMIN,
    ):
        return True

    if actor.role == User.Role.DOCTOR:
        return target_user.role == User.Role.PATIENT

    return False


def build_medical_payload(user):
    questions = list(
        Question.objects.filter(
            is_active=True
        ).prefetch_related("options")
    )

    answer_map = {
        answer.question_id: answer.value
        for answer in QuestionAnswer.objects.filter(
            user=user,
            question__in=questions,
        )
    }

    serialized_questions = []
    required_total = 0
    required_answered = 0

    for question in questions:
        value = answer_map.get(question.id)

        if question.is_required:
            required_total += 1
            if not is_empty_answer(value):
                required_answered += 1

        options = [
            {
                "id": option.id,
                "text": option.text,
                "order": option.order,
            }
            for option in question.options.all()
        ]

        serialized_questions.append(
            {
                "id": question.id,
                "text": question.text,
                "question_type": question.question_type,
                "question_type_display": question.get_question_type_display(),
                "is_required": question.is_required,
                "order": question.order,
                "options": options,
                "answer": value,
                "answer_display": display_answer(
                    question,
                    value,
                    options,
                ),
            }
        )

    return {
        "questions": serialized_questions,
        "completion": {
            "required_total": required_total,
            "required_answered": required_answered,
            "is_complete": (
                required_total == 0
                or required_total == required_answered
            ),
        },
    }


def normalize_answer(question, value):
    if is_empty_answer(value):
        return None

    if question.question_type == Question.QuestionType.TEXTAREA:
        if not isinstance(value, str):
            raise ValueError("Matn ko‘rinishidagi javob kiritilishi kerak.")
        return value.strip()

    if question.question_type == Question.QuestionType.DATE:
        try:
            validated_date = DateField().run_validation(value)
        except Exception as exc:
            raise ValueError("Sana noto‘g‘ri formatda.") from exc
        return validated_date.isoformat()

    valid_option_ids = {
        option.id
        for option in question.options.all()
    }

    if question.question_type in (
        Question.QuestionType.RADIO,
        Question.QuestionType.SELECT,
    ):
        try:
            option_id = int(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("Javob variantini tanlang.") from exc

        if option_id not in valid_option_ids:
            raise ValueError("Tanlangan variant ushbu savolga tegishli emas.")

        return option_id

    if question.question_type == Question.QuestionType.CHECKBOX:
        if not isinstance(value, list):
            raise ValueError("Checkbox javobi ro‘yxat bo‘lishi kerak.")

        try:
            option_ids = list(
                dict.fromkeys(int(item) for item in value)
            )
        except (TypeError, ValueError) as exc:
            raise ValueError("Checkbox variantlari noto‘g‘ri.") from exc

        if any(
            option_id not in valid_option_ids
            for option_id in option_ids
        ):
            raise ValueError("Tanlangan variantlardan biri ushbu savolga tegishli emas.")

        return option_ids

    raise ValueError("Noma’lum savol turi.")


def display_answer(question, value, options):
    if is_empty_answer(value):
        return None

    if question.question_type in (
        Question.QuestionType.TEXTAREA,
        Question.QuestionType.DATE,
    ):
        return value

    option_map = {
        option["id"]: option["text"]
        for option in options
    }

    if question.question_type in (
        Question.QuestionType.RADIO,
        Question.QuestionType.SELECT,
    ):
        return option_map.get(value)

    if question.question_type == Question.QuestionType.CHECKBOX:
        return [
            option_map.get(option_id, str(option_id))
            for option_id in value
        ]

    return value


def is_empty_answer(value):
    return value is None or value == "" or value == []
