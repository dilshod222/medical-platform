# Generated for MedConnect messaging module.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("users", "0003_dynamic_doctor_types"),
    ]

    operations = [
        migrations.CreateModel(
            name="ChatThread",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("last_message_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="patient_chat_threads", to=settings.AUTH_USER_MODEL, verbose_name="Bemor")),
                ("staff", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="staff_chat_threads", to=settings.AUTH_USER_MODEL, verbose_name="Yuboruvchi xodim")),
            ],
            options={
                "verbose_name": "Yozishma",
                "verbose_name_plural": "Yozishmalar",
                "ordering": ("-last_message_at", "-updated_at"),
            },
        ),
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("body", models.TextField(max_length=2000, verbose_name="Xabar")),
                ("is_read", models.BooleanField(db_index=True, default=False, verbose_name="O‘qilgan")),
                ("read_at", models.DateTimeField(blank=True, null=True, verbose_name="O‘qilgan vaqt")),
                ("is_deleted", models.BooleanField(db_index=True, default=False, verbose_name="O‘chirilgan")),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("edited_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="deleted_chat_messages", to=settings.AUTH_USER_MODEL)),
                ("sender", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="sent_chat_messages", to=settings.AUTH_USER_MODEL, verbose_name="Yuboruvchi")),
                ("thread", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="chat.chatthread", verbose_name="Yozishma")),
            ],
            options={
                "verbose_name": "Xabar",
                "verbose_name_plural": "Xabarlar",
                "ordering": ("created_at", "id"),
            },
        ),
        migrations.CreateModel(
            name="ChatMessageRevision",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("previous_body", models.TextField()),
                ("action", models.CharField(choices=[("EDIT", "Tahrirlandi"), ("DELETE", "O‘chirildi")], max_length=10)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("changed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="chat_message_revisions", to=settings.AUTH_USER_MODEL)),
                ("message", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="revisions", to="chat.chatmessage")),
            ],
            options={
                "verbose_name": "Xabar tarixi",
                "verbose_name_plural": "Xabarlar tarixi",
                "ordering": ("-created_at",),
            },
        ),
        migrations.AddConstraint(
            model_name="chatthread",
            constraint=models.UniqueConstraint(fields=("patient", "staff"), name="unique_patient_staff_chat_thread"),
        ),
        migrations.AddIndex(
            model_name="chatthread",
            index=models.Index(fields=["patient", "-last_message_at"], name="chat_chattr_patient_158c9d_idx"),
        ),
        migrations.AddIndex(
            model_name="chatthread",
            index=models.Index(fields=["staff", "-last_message_at"], name="chat_chattr_staff_i_970aa0_idx"),
        ),
        migrations.AddIndex(
            model_name="chatmessage",
            index=models.Index(fields=["thread", "created_at"], name="chat_chatme_thread__6547b5_idx"),
        ),
        migrations.AddIndex(
            model_name="chatmessage",
            index=models.Index(fields=["thread", "is_read"], name="chat_chatme_thread__f7e35e_idx"),
        ),
    ]
