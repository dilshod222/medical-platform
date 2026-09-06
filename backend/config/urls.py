from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def service_info(request):
    return JsonResponse(
        {
            "status": "ok",
            "service": "MedConnect API",
            "health": "/api/health/",
            "login": "/api/auth/login/",
        }
    )


def health_check(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    # Opening http://127.0.0.1:8000/ now confirms that Django is running.
    path("", service_info, name="service-info"),
    path("django-admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/", include("users.urls")),
    path("api/", include("questionnaires.urls")),
    path("api/", include("chat.urls")),
]
