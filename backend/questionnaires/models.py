from django.conf import settings
from django.db import models


class Question(models.Model):
    class QuestionType(models.TextChoices):
        TEXTAREA = "TEXTAREA", "Matn maydoni"
        DATE = "DATE", "Sana"
        RADIO = "RADIO", "Bitta javob"
        CHECKBOX = "CHECKBOX", "Bir nechta javob"
        SELECT = "SELECT", "Tanlov ro‘yxati"

    text = models.TextField(
        verbose_name="Savol",
    )

    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices,
        verbose_name="Savol turi",
    )

    is_required = models.BooleanField(
        default=True,
        verbose_name="Majburiy",
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name="Faol",
    )

    order = models.PositiveIntegerField(
        default=0,
        verbose_name="Tartib",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_questions",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = (
            "order",
            "id",
        )

    def __str__(self):
        return self.text[:80]


class QuestionOption(models.Model):
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="options",
    )

    text = models.CharField(
        max_length=500,
    )

    order = models.PositiveIntegerField(
        default=0,
    )

    class Meta:
        ordering = (
            "order",
            "id",
        )

    def __str__(self):
        return self.text


class QuestionAnswer(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="questionnaire_answers",
    )

    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="answers",
    )

    value = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Javob",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("user", "question"),
                name="unique_user_question_answer",
            )
        ]
        ordering = ("question_id",)

    def __str__(self):
        return f"{self.user} - {self.question}"
