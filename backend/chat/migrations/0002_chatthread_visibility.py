from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="chatthread",
            name="patient_hidden_at",
            field=models.DateTimeField(
                blank=True,
                db_index=True,
                null=True,
                verbose_name="Bemor ro‘yxatidan yashirilgan vaqt",
            ),
        ),
        migrations.AddField(
            model_name="chatthread",
            name="staff_hidden_at",
            field=models.DateTimeField(
                blank=True,
                db_index=True,
                null=True,
                verbose_name="Xodim ro‘yxatidan yashirilgan vaqt",
            ),
        ),
    ]
