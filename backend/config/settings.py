"""
MedConnect Django settings.

Local development:
    python manage.py runserver

Staging / Render:
    configuration is taken from environment variables.
"""

import os
from pathlib import Path

import dj_database_url


BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name, default=False):
    value = os.environ.get(name)

    if value is None:
        return default

    return value.strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def env_list(name, default=None):
    value = os.environ.get(name, "")

    if not value.strip():
        return list(default or [])

    return [
        item.strip()
        for item in value.split(",")
        if item.strip()
    ]


SECRET_KEY = os.environ.get(
    "SECRET_KEY",
    "django-insecure-local-medconnect-development-key",
)

DEBUG = env_bool(
    "DEBUG",
    default=True,
)


ALLOWED_HOSTS = env_list(
    "ALLOWED_HOSTS",
    default=[
        "127.0.0.1",
        "localhost",
    ],
)

render_hostname = os.environ.get(
    "RENDER_EXTERNAL_HOSTNAME"
)

if (
    render_hostname
    and render_hostname not in ALLOWED_HOSTS
):
    ALLOWED_HOSTS.append(
        render_hostname
    )


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",
    "corsheaders",

    # Local
    "users",
    "questionnaires",
    "chat",
]


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",

    # WhiteNoise productionda Django static fayllarini beradi.
    "whitenoise.middleware.WhiteNoiseMiddleware",

    # CORS CommonMiddleware'dan oldin turishi kerak.
    "corsheaders.middleware.CorsMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "config.urls"


TEMPLATES = [
    {
        "BACKEND": (
            "django.template.backends.django.DjangoTemplates"
        ),
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                (
                    "django.template.context_processors."
                    "request"
                ),
                (
                    "django.contrib.auth.context_processors."
                    "auth"
                ),
                (
                    "django.contrib.messages.context_processors."
                    "messages"
                ),
            ],
        },
    },
]


WSGI_APPLICATION = "config.wsgi.application"


DATABASE_URL = os.environ.get(
    "DATABASE_URL"
)

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": (
                "django.db.backends.sqlite3"
            ),
            "NAME": (
                BASE_DIR
                / "db.sqlite3"
            ),
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        ),
    },
]


LANGUAGE_CODE = "uz"
TIME_ZONE = "Asia/Tashkent"

USE_I18N = True
USE_TZ = True


STATIC_URL = "/static/"

STATIC_ROOT = (
    BASE_DIR
    / "staticfiles"
)

STORAGES = {
    "default": {
        "BACKEND": (
            "django.core.files.storage."
            "FileSystemStorage"
        ),
    },
    "staticfiles": {
        "BACKEND": (
            "whitenoise.storage."
            "CompressedManifestStaticFilesStorage"
        ),
    },
}


DEFAULT_AUTO_FIELD = (
    "django.db.models.BigAutoField"
)

AUTH_USER_MODEL = "users.User"


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        (
            "rest_framework_simplejwt."
            "authentication."
            "JWTAuthentication"
        ),
    ),
}


LOCAL_FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CORS_ALLOWED_ORIGINS = (
    LOCAL_FRONTEND_ORIGINS
    + env_list(
        "CORS_ALLOWED_ORIGINS"
    )
)

# Duplicate originlarni olib tashlaymiz.
CORS_ALLOWED_ORIGINS = list(
    dict.fromkeys(
        CORS_ALLOWED_ORIGINS
    )
)


CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS"
)


# Render HTTPS load balancer ortida ishlaydi.
SECURE_PROXY_SSL_HEADER = (
    "HTTP_X_FORWARDED_PROTO",
    "https",
)


if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    SECURE_CONTENT_TYPE_NOSNIFF = True

    X_FRAME_OPTIONS = "DENY"

    SECURE_REFERRER_POLICY = (
        "same-origin"
    )
