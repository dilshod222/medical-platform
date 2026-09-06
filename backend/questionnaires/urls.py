from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    MedicalQuestionnaireView,
    MedicalUserDetailView,
    QuestionViewSet,
)


router = DefaultRouter()
router.register(
    "questions",
    QuestionViewSet,
    basename="question",
)

urlpatterns = router.urls + [
    path(
        "medical/my/",
        MedicalQuestionnaireView.as_view(),
        name="medical-my",
    ),
    path(
        "medical/users/<int:pk>/",
        MedicalUserDetailView.as_view(),
        name="medical-user-detail",
    ),
]
