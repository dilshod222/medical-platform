from django.contrib import admin

from .models import (
    ChatMessage,
    ChatMessageRevision,
    ChatThread,
)


@admin.register(ChatThread)
class ChatThreadAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "staff",
        "patient",
        "last_message_at",
        "created_at",
    )
    search_fields = (
        "staff__email",
        "staff__first_name",
        "staff__last_name",
        "patient__email",
        "patient__first_name",
        "patient__last_name",
    )
    list_select_related = (
        "staff",
        "patient",
    )


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "sender",
        "thread",
        "is_read",
        "is_deleted",
        "edited_at",
        "created_at",
    )
    list_filter = (
        "is_read",
        "is_deleted",
        "created_at",
    )
    search_fields = (
        "body",
        "sender__email",
        "thread__patient__email",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
        "edited_at",
        "deleted_at",
    )


@admin.register(ChatMessageRevision)
class ChatMessageRevisionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "message",
        "action",
        "changed_by",
        "created_at",
    )
    list_filter = (
        "action",
        "created_at",
    )
    readonly_fields = (
        "message",
        "previous_body",
        "action",
        "changed_by",
        "created_at",
    )
