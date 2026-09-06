from django.db import transaction
from rest_framework import serializers

from .models import Question, QuestionOption


class QuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = (
            "id",
            "text",
            "order",
        )
        read_only_fields = ("id",)


class QuestionSerializer(serializers.ModelSerializer):
    options = QuestionOptionSerializer(
        many=True,
        required=False,
    )

    question_type_display = serializers.CharField(
        source="get_question_type_display",
        read_only=True,
    )

    class Meta:
        model = Question
        fields = (
            "id",
            "text",
            "question_type",
            "question_type_display",
            "is_required",
            "is_active",
            "order",
            "options",
            "created_at",
        )
        read_only_fields = (
            "id",
            "question_type_display",
            "created_at",
        )

    def validate(self, attrs):
        question_type = attrs.get(
            "question_type",
            getattr(self.instance, "question_type", None),
        )
        options = attrs.get("options", None)

        option_types = (
            Question.QuestionType.RADIO,
            Question.QuestionType.CHECKBOX,
            Question.QuestionType.SELECT,
        )

        if question_type in option_types:
            if options is not None:
                clean_options = [
                    option
                    for option in options
                    if str(option.get("text", "")).strip()
                ]

                if len(clean_options) < 2:
                    raise serializers.ValidationError(
                        {
                            "options": (
                                "Radio, checkbox yoki select uchun kamida "
                                "2 ta javob varianti kerak."
                            )
                        }
                    )
            elif self.instance is None:
                raise serializers.ValidationError(
                    {
                        "options": (
                            "Radio, checkbox yoki select uchun kamida "
                            "2 ta javob varianti kerak."
                        )
                    }
                )
            elif self.instance.options.count() < 2:
                raise serializers.ValidationError(
                    {
                        "options": (
                            "Radio, checkbox yoki select uchun kamida "
                            "2 ta javob varianti kerak."
                        )
                    }
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        options_data = validated_data.pop("options", [])
        request = self.context.get("request")

        question = Question.objects.create(
            created_by=(
                request.user
                if request and request.user.is_authenticated
                else None
            ),
            **validated_data,
        )

        if self._requires_options(question.question_type):
            self._replace_options(question, options_data)

        return question

    @transaction.atomic
    def update(self, instance, validated_data):
        options_data = validated_data.pop("options", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if not self._requires_options(instance.question_type):
            instance.options.all().delete()
        elif options_data is not None:
            self._replace_options(instance, options_data)

        return instance

    @staticmethod
    def _requires_options(question_type):
        return question_type in (
            Question.QuestionType.RADIO,
            Question.QuestionType.CHECKBOX,
            Question.QuestionType.SELECT,
        )

    @staticmethod
    def _replace_options(question, options_data):
        question.options.all().delete()

        for index, option in enumerate(options_data):
            text = str(option.get("text", "")).strip()
            if not text:
                continue

            QuestionOption.objects.create(
                question=question,
                text=text,
                order=option.get("order", index),
            )
