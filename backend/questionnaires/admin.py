from django.contrib import admin

from .models import Question, QuestionAnswer, QuestionOption


class QuestionOptionInline(admin.TabularInline):
    model = QuestionOption
    extra = 0


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "text",
        "question_type",
        "is_required",
        "is_active",
        "order",
        "created_at",
    )
    list_filter = (
        "question_type",
        "is_required",
        "is_active",
    )
    search_fields = ("text",)
    ordering = ("order", "id")
    inlines = (QuestionOptionInline,)


@admin.register(QuestionOption)
class QuestionOptionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "question",
        "text",
        "order",
    )
    search_fields = (
        "question__text",
        "text",
    )


@admin.register(QuestionAnswer)
class QuestionAnswerAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "question",
        "updated_at",
    )
    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "question__text",
    )
    list_select_related = (
        "user",
        "question",
    )
