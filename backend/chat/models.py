from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class ChatThread(models.Model):
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="patient_chat_threads",
        verbose_name="Bemor",
    )
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="staff_chat_threads",
        verbose_name="Yuboruvchi xodim",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
    )

    # Yozishmani foydalanuvchi o‘z ro‘yxatidan yashirishi mumkin.
    # Bu soft-hide: admin/superadmin audit uchun yozishmani baribir ko‘radi.
    staff_hidden_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Xodim ro‘yxatidan yashirilgan vaqt",
    )
    patient_hidden_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Bemor ro‘yxatidan yashirilgan vaqt",
    )

    class Meta:
        ordering = ("-last_message_at", "-updated_at")
        constraints = [
            models.UniqueConstraint(
                fields=("patient", "staff"),
                name="unique_patient_staff_chat_thread",
            )
        ]
        indexes = [
            models.Index(fields=("patient", "-last_message_at")),
            models.Index(fields=("staff", "-last_message_at")),
        ]
        verbose_name = "Yozishma"
        verbose_name_plural = "Yozishmalar"

    def clean(self):
        if self.patient_id == self.staff_id:
            raise ValidationError(
                "Bemor va yuboruvchi bir xil foydalanuvchi bo‘la olmaydi."
            )

    def hide_for(self, user):
        now = timezone.now()

        if user.id == self.patient_id:
            self.patient_hidden_at = now
            self.save(update_fields=("patient_hidden_at", "updated_at"))
            return

        if user.id == self.staff_id:
            self.staff_hidden_at = now
            self.save(update_fields=("staff_hidden_at", "updated_at"))
            return

        raise ValidationError("Bu yozishmani yashirishga ruxsat yo‘q.")

    def unhide_for(self, user):
        if user.id == self.patient_id and self.patient_hidden_at is not None:
            self.patient_hidden_at = None
            self.save(update_fields=("patient_hidden_at", "updated_at"))

        elif user.id == self.staff_id and self.staff_hidden_at is not None:
            self.staff_hidden_at = None
            self.save(update_fields=("staff_hidden_at", "updated_at"))

    def __str__(self):
        return f"{self.staff} → {self.patient}"


class ChatMessage(models.Model):
    thread = models.ForeignKey(
        ChatThread,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="Yozishma",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="sent_chat_messages",
        verbose_name="Yuboruvchi",
    )
    body = models.TextField(
        max_length=2000,
        verbose_name="Xabar",
    )
    is_read = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="O‘qilgan",
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="O‘qilgan vaqt",
    )
    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="O‘chirilgan",
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deleted_chat_messages",
    )
    edited_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("created_at", "id")
        indexes = [
            models.Index(fields=("thread", "created_at")),
            models.Index(fields=("thread", "is_read")),
        ]
        verbose_name = "Xabar"
        verbose_name_plural = "Xabarlar"

    def clean(self):
        if self.thread_id and self.sender_id:
            allowed_sender_ids = {
                self.thread.staff_id,
                self.thread.patient_id,
            }

            if self.sender_id not in allowed_sender_ids:
                raise ValidationError(
                    "Xabarni faqat yozishmadagi doktor/xodim yoki bemor yuborishi mumkin."
                )

    def mark_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=("is_read", "read_at", "updated_at"))

    def __str__(self):
        return f"{self.sender}: {self.body[:60]}"


class ChatMessageRevision(models.Model):
    class Action(models.TextChoices):
        EDIT = "EDIT", "Tahrirlandi"
        DELETE = "DELETE", "O‘chirildi"

    message = models.ForeignKey(
        ChatMessage,
        on_delete=models.CASCADE,
        related_name="revisions",
    )
    previous_body = models.TextField()
    action = models.CharField(
        max_length=10,
        choices=Action.choices,
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_message_revisions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = "Xabar tarixi"
        verbose_name_plural = "Xabarlar tarixi"

    def __str__(self):
        return f"{self.message_id} / {self.get_action_display()}"
