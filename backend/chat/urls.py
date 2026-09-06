from django.urls import path

from .views import (
    ChatAvailablePatientsView,
    ChatMessageDetailView,
    ChatThreadDetailView,
    ChatThreadListCreateView,
    ChatThreadMessagesView,
    ChatUnreadCountView,
)


urlpatterns = [
    path(
        "chat/threads/",
        ChatThreadListCreateView.as_view(),
        name="chat-thread-list-create",
    ),
    path(
        "chat/threads/<int:pk>/",
        ChatThreadDetailView.as_view(),
        name="chat-thread-detail",
    ),
    path(
        "chat/unread-count/",
        ChatUnreadCountView.as_view(),
        name="chat-unread-count",
    ),
    path(
        "chat/patients/",
        ChatAvailablePatientsView.as_view(),
        name="chat-available-patients",
    ),
    path(
        "chat/threads/<int:pk>/messages/",
        ChatThreadMessagesView.as_view(),
        name="chat-thread-messages",
    ),
    path(
        "chat/messages/<int:pk>/",
        ChatMessageDetailView.as_view(),
        name="chat-message-detail",
    ),
]
