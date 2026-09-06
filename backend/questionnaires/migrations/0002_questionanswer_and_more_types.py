import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def create_default_medical_questions_and_migrate_data(apps, schema_editor):
    Question = apps.get_model("questionnaires", "Question")
    QuestionOption = apps.get_model("questionnaires", "QuestionOption")
    QuestionAnswer = apps.get_model("questionnaires", "QuestionAnswer")
    User = apps.get_model("users", "User")

    birth_question, _ = Question.objects.get_or_create(
        text="Tug‘ilgan sana",
        defaults={
            "question_type": "DATE",
            "is_required": True,
            "is_active": True,
            "order": 0,
        },
    )

    gender_question, gender_created = Question.objects.get_or_create(
        text="Jins",
        defaults={
            "question_type": "RADIO",
            "is_required": True,
            "is_active": True,
            "order": 1,
        },
    )

    if gender_created or gender_question.options.count() < 2:
        gender_question.options.all().delete()
        male_option = QuestionOption.objects.create(
            question=gender_question,
            text="Erkak",
            order=0,
        )
        female_option = QuestionOption.objects.create(
            question=gender_question,
            text="Ayol",
            order=1,
        )
    else:
        male_option = gender_question.options.order_by("order", "id").first()
        female_option = gender_question.options.order_by("order", "id")[1]

    address_question, _ = Question.objects.get_or_create(
        text="Manzil",
        defaults={
            "question_type": "TEXTAREA",
            "is_required": True,
            "is_active": True,
            "order": 2,
        },
    )

    disease_question, _ = Question.objects.get_or_create(
        text="Kasallik yoki murojaat sababi",
        defaults={
            "question_type": "TEXTAREA",
            "is_required": True,
            "is_active": True,
            "order": 3,
        },
    )

    additional_question, _ = Question.objects.get_or_create(
        text="Qo‘shimcha ma’lumot",
        defaults={
            "question_type": "TEXTAREA",
            "is_required": False,
            "is_active": True,
            "order": 4,
        },
    )

    for user in User.objects.all().iterator():
        if user.birth_date:
            QuestionAnswer.objects.update_or_create(
                user=user,
                question=birth_question,
                defaults={"value": user.birth_date.isoformat()},
            )

        if user.gender == "MALE" and male_option:
            QuestionAnswer.objects.update_or_create(
                user=user,
                question=gender_question,
                defaults={"value": male_option.id},
            )
        elif user.gender == "FEMALE" and female_option:
            QuestionAnswer.objects.update_or_create(
                user=user,
                question=gender_question,
                defaults={"value": female_option.id},
            )

        if user.address:
            QuestionAnswer.objects.update_or_create(
                user=user,
                question=address_question,
                defaults={"value": user.address},
            )

        if user.disease:
            QuestionAnswer.objects.update_or_create(
                user=user,
                question=disease_question,
                defaults={"value": user.disease},
            )

        if user.additional_info:
            QuestionAnswer.objects.update_or_create(
                user=user,
                question=additional_question,
                defaults={"value": user.additional_info},
            )


def reverse_default_medical_questions(apps, schema_editor):
    Question = apps.get_model("questionnaires", "Question")

    Question.objects.filter(
        text__in=[
            "Tug‘ilgan sana",
            "Jins",
            "Manzil",
            "Kasallik yoki murojaat sababi",
            "Qo‘shimcha ma’lumot",
        ]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        (
            "questionnaires",
            "0001_initial",
        ),
        (
            "users",
            "0003_dynamic_doctor_types",
        ),
    ]

    operations = [
        migrations.AlterField(
            model_name="question",
            name="question_type",
            field=models.CharField(
                choices=[
                    ("TEXTAREA", "Matn maydoni"),
                    ("DATE", "Sana"),
                    ("RADIO", "Bitta javob"),
                    ("CHECKBOX", "Bir nechta javob"),
                    ("SELECT", "Tanlov ro‘yxati"),
                ],
                max_length=20,
                verbose_name="Savol turi",
            ),
        ),
        migrations.CreateModel(
            name="QuestionAnswer",
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
                    "value",
                    models.JSONField(
                        blank=True,
                        null=True,
                        verbose_name="Javob",
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
                    "question",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="answers",
                        to="questionnaires.question",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="questionnaire_answers",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ("question_id",),
                "constraints": [
                    models.UniqueConstraint(
                        fields=("user", "question"),
                        name="unique_user_question_answer",
                    )
                ],
            },
        ),
        migrations.RunPython(
            create_default_medical_questions_and_migrate_data,
            reverse_default_medical_questions,
        ),
    ]
