import django.db.models.deletion
from django.db import migrations, models


def migrate_old_doctor_type(apps, schema_editor):
    DoctorType = apps.get_model("users", "DoctorType")
    User = apps.get_model("users", "User")

    default_type, _ = DoctorType.objects.get_or_create(
        name="Doctor Type 1",
        defaults={
            "description": "Oldingi TYPE1 doktor turi migratsiya qilindi.",
            "is_active": True,
        },
    )

    User.objects.filter(
        doctor_type="TYPE1"
    ).update(
        doctor_type_ref=default_type
    )


def reverse_old_doctor_type(apps, schema_editor):
    User = apps.get_model("users", "User")

    User.objects.filter(
        doctor_type_ref__isnull=False
    ).update(
        doctor_type="TYPE1"
    )


class Migration(migrations.Migration):

    dependencies = [
        (
            "users",
            "0002_user_additional_info_user_address_user_birth_date_and_more",
        ),
    ]

    operations = [
        migrations.CreateModel(
            name="DoctorType",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        max_length=120,
                        unique=True,
                        verbose_name="Doktor turi nomi",
                    ),
                ),
                (
                    "description",
                    models.TextField(
                        blank=True,
                        verbose_name="Izoh",
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(
                        default=True,
                        verbose_name="Faol",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_doctor_types",
                        to="users.user",
                    ),
                ),
            ],
            options={
                "verbose_name": "Doktor turi",
                "verbose_name_plural": "Doktor turlari",
                "ordering": ("name",),
            },
        ),
        migrations.AddField(
            model_name="user",
            name="doctor_type_ref",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="doctors",
                to="users.doctortype",
                verbose_name="Doktor turi",
            ),
        ),
        migrations.RunPython(
            migrate_old_doctor_type,
            reverse_old_doctor_type,
        ),
        migrations.RemoveField(
            model_name="user",
            name="doctor_type",
        ),
        migrations.RenameField(
            model_name="user",
            old_name="doctor_type_ref",
            new_name="doctor_type",
        ),
    ]
