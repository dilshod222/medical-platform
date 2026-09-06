import os
from datetime import date

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from questionnaires.models import (
    Question,
    QuestionAnswer,
    QuestionOption,
)
from users.models import (
    DoctorType,
    User,
)

try:
    from chat.models import (
        ChatMessage,
        ChatThread,
    )
except ImportError:
    ChatMessage = None
    ChatThread = None


DEMO_DOMAIN = "@staging.medconnect.demo"

DEMO_PASSWORD = os.environ.get(
    "STAGING_DEMO_PASSWORD",
    "Demo12345!",
)


DOCTOR_TYPES = [
    (
        "Terapevt",
        "Birlamchi umumiy tibbiy maslahat.",
    ),
    (
        "Kardiolog",
        "Yurak-qon tomir kasalliklari.",
    ),
    (
        "Pediatr",
        "Bolalar salomatligi.",
    ),
    (
        "Nevrolog",
        "Asab tizimi kasalliklari.",
    ),
    (
        "Dermatolog",
        "Teri kasalliklari.",
    ),
]


PATIENTS = [
    (
        "patient1@staging.medconnect.demo",
        "+998901110001",
        "Aziza",
        "Xodiyeva",
    ),
    (
        "patient2@staging.medconnect.demo",
        "+998901110002",
        "Bekzod",
        "Nazarov",
    ),
    (
        "patient3@staging.medconnect.demo",
        "+998901110003",
        "Dilnoza",
        "Ismoilova",
    ),
    (
        "patient4@staging.medconnect.demo",
        "+998901110004",
        "Sardor",
        "Saidov",
    ),
    (
        "patient5@staging.medconnect.demo",
        "+998901110005",
        "Sevara",
        "Shukurova",
    ),
]


DOCTORS = [
    (
        "doctor1@staging.medconnect.demo",
        "+998911110001",
        "Ali",
        "Valiyev",
        "Terapevt",
    ),
    (
        "doctor2@staging.medconnect.demo",
        "+998911110002",
        "Rustam",
        "Hakimov",
        "Kardiolog",
    ),
]


ADMIN = (
    "admin@staging.medconnect.demo",
    "+998931110001",
    "Malika",
    "Adminova",
)


SUPERADMIN = (
    "superadmin@staging.medconnect.demo",
    "+998951110001",
    "Dilshod",
    "Superadmin",
)


QUESTION_SPECS = [
    {
        "key": "complaint",
        "text": (
            "Asosiy shikoyatingiz yoki "
            "murojaat sababini yozing"
        ),
        "type": Question.QuestionType.TEXTAREA,
        "required": True,
        "options": [],
    },
    {
        "key": "start_date",
        "text": (
            "Shikoyatingiz qachondan "
            "boshlangan?"
        ),
        "type": Question.QuestionType.DATE,
        "required": True,
        "options": [],
    },
    {
        "key": "chronic",
        "text": (
            "Surunkali kasalligingiz "
            "bormi?"
        ),
        "type": Question.QuestionType.RADIO,
        "required": True,
        "options": [
            "Ha",
            "Yo‘q",
        ],
    },
    {
        "key": "symptoms",
        "text": (
            "Hozir sizda qaysi "
            "belgilar mavjud?"
        ),
        "type": Question.QuestionType.CHECKBOX,
        "required": True,
        "options": [
            "Bosh og‘rig‘i",
            "Holsizlik",
            "Yo‘tal",
            "Isitma",
        ],
    },
    {
        "key": "allergy",
        "text": (
            "Allergiya holatingizni "
            "tanlang"
        ),
        "type": Question.QuestionType.SELECT,
        "required": True,
        "options": [
            "Allergiya yo‘q",
            "Dori vositalariga",
            "Oziq-ovqatga",
            "Boshqa",
        ],
    },
]


class Command(BaseCommand):
    help = (
        "Staging demo uchun sintetik "
        "foydalanuvchilar, rollar, "
        "doktor turlari, anketa va "
        "xabarlar yaratadi."
    )


    @transaction.atomic
    def handle(
        self,
        *args,
        **options,
    ):
        superadmin = (
            self._upsert_user(
                email=SUPERADMIN[0],
                phone=SUPERADMIN[1],
                first_name=SUPERADMIN[2],
                last_name=SUPERADMIN[3],
                role=User.Role.SUPERADMIN,
                is_staff=True,
                is_superuser=True,
            )
        )


        doctor_types = (
            self._seed_doctor_types(
                superadmin
            )
        )


        admin = self._upsert_user(
            email=ADMIN[0],
            phone=ADMIN[1],
            first_name=ADMIN[2],
            last_name=ADMIN[3],
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=False,
        )


        doctors = []

        for (
            email,
            phone,
            first_name,
            last_name,
            doctor_type_name,
        ) in DOCTORS:
            doctors.append(
                self._upsert_user(
                    email=email,
                    phone=phone,
                    first_name=first_name,
                    last_name=last_name,
                    role=User.Role.DOCTOR,
                    doctor_type=(
                        doctor_types[
                            doctor_type_name
                        ]
                    ),
                    is_staff=False,
                    is_superuser=False,
                )
            )


        patients = []

        for (
            email,
            phone,
            first_name,
            last_name,
        ) in PATIENTS:
            patients.append(
                self._upsert_user(
                    email=email,
                    phone=phone,
                    first_name=first_name,
                    last_name=last_name,
                    role=User.Role.PATIENT,
                    doctor_type=None,
                    is_staff=False,
                    is_superuser=False,
                )
            )


        questions = (
            self._seed_questions(
                superadmin
            )
        )


        self._seed_answers(
            patients,
            questions,
        )


        self._seed_chats(
            patients=patients,
            doctors=doctors,
            admin=admin,
            superadmin=superadmin,
        )


        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                "Staging demo data tayyor."
            )
        )

        self.stdout.write(
            f"Foydalanuvchilar: "
            f"{1 + 1 + len(doctors) + len(patients)}"
        )

        self.stdout.write(
            f"Doktor turlari: "
            f"{len(doctor_types)}"
        )

        self.stdout.write("")
        self.stdout.write(
            "Barcha demo akkauntlar paroli:"
        )
        self.stdout.write(
            self.style.WARNING(
                DEMO_PASSWORD
            )
        )

        self.stdout.write("")
        self.stdout.write(
            "SUPERADMIN: "
            f"{SUPERADMIN[0]}"
        )
        self.stdout.write(
            "ADMIN:      "
            f"{ADMIN[0]}"
        )
        self.stdout.write(
            "DOCTOR:     "
            f"{DOCTORS[0][0]}"
        )
        self.stdout.write(
            "PATIENT:    "
            f"{PATIENTS[0][0]}"
        )


    def _seed_doctor_types(
        self,
        superadmin,
    ):
        result = {}

        for (
            name,
            description,
        ) in DOCTOR_TYPES:
            doctor_type, _ = (
                DoctorType.objects.update_or_create(
                    name=name,
                    defaults={
                        "description":
                            description,
                        "is_active":
                            True,
                        "created_by":
                            superadmin,
                    },
                )
            )

            result[name] = (
                doctor_type
            )

        return result


    def _seed_questions(
        self,
        superadmin,
    ):
        result = {}

        for (
            order,
            spec,
        ) in enumerate(
            QUESTION_SPECS,
            start=1,
        ):
            question, _ = (
                Question.objects.update_or_create(
                    text=spec["text"],
                    defaults={
                        "question_type":
                            spec["type"],
                        "is_required":
                            spec["required"],
                        "is_active":
                            True,
                        "order":
                            order,
                        "created_by":
                            superadmin,
                    },
                )
            )


            question.options.all().delete()


            for (
                option_order,
                option_text,
            ) in enumerate(
                spec["options"],
                start=1,
            ):
                QuestionOption.objects.create(
                    question=question,
                    text=option_text,
                    order=option_order,
                )


            result[
                spec["key"]
            ] = question


        return result


    def _seed_answers(
        self,
        patients,
        questions,
    ):
        complaints = [
            (
                "Bosh og‘rig‘i va "
                "tez charchash."
            ),
            (
                "Qon bosimi ba’zan "
                "ko‘tariladi."
            ),
            (
                "Yo‘tal va tomoq "
                "og‘rig‘i."
            ),
            (
                "Qorin sohasida "
                "noqulaylik."
            ),
            (
                "Allergik toshma "
                "kuzatilmoqda."
            ),
        ]


        for (
            index,
            patient,
        ) in enumerate(
            patients
        ):
            self._set_answer(
                patient,
                questions[
                    "complaint"
                ],
                complaints[index],
            )

            self._set_answer(
                patient,
                questions[
                    "start_date"
                ],
                date(
                    2026,
                    9,
                    1 + index,
                ).isoformat(),
            )


            chronic_options = list(
                questions[
                    "chronic"
                ].options.all()
            )

            if chronic_options:
                self._set_answer(
                    patient,
                    questions[
                        "chronic"
                    ],
                    (
                        chronic_options[
                            0
                            if index == 1
                            else 1
                        ].id
                    ),
                )


            symptom_options = list(
                questions[
                    "symptoms"
                ].options.all()
            )

            if symptom_options:
                values = [
                    symptom_options[
                        index
                        % len(
                            symptom_options
                        )
                    ].id
                ]

                if (
                    len(
                        symptom_options
                    )
                    > 1
                ):
                    values.append(
                        symptom_options[
                            (
                                index
                                + 1
                            )
                            % len(
                                symptom_options
                            )
                        ].id
                    )

                self._set_answer(
                    patient,
                    questions[
                        "symptoms"
                    ],
                    list(
                        dict.fromkeys(
                            values
                        )
                    ),
                )


            allergy_options = list(
                questions[
                    "allergy"
                ].options.all()
            )

            if allergy_options:
                self._set_answer(
                    patient,
                    questions[
                        "allergy"
                    ],
                    allergy_options[
                        index
                        % len(
                            allergy_options
                        )
                    ].id,
                )


    @staticmethod
    def _set_answer(
        user,
        question,
        value,
    ):
        QuestionAnswer.objects.update_or_create(
            user=user,
            question=question,
            defaults={
                "value": value,
            },
        )


    def _seed_chats(
        self,
        *,
        patients,
        doctors,
        admin,
        superadmin,
    ):
        if (
            ChatThread is None
            or ChatMessage is None
        ):
            return


        chat_specs = [
            (
                patients[0],
                doctors[0],
                [
                    (
                        doctors[0],
                        (
                            "Assalomu alaykum. "
                            "Tibbiy anketangiz "
                            "bilan tanishib chiqdim."
                        ),
                    ),
                    (
                        patients[0],
                        (
                            "Assalomu alaykum, "
                            "rahmat. Qo‘shimcha "
                            "savollaringiz bo‘lsa "
                            "javob beraman."
                        ),
                    ),
                ],
            ),
            (
                patients[1],
                doctors[1],
                [
                    (
                        doctors[1],
                        (
                            "Qon bosimingizni "
                            "bir necha kun "
                            "kuzatib boring."
                        ),
                    ),
                ],
            ),
            (
                patients[2],
                admin,
                [
                    (
                        admin,
                        (
                            "Murojaatingiz "
                            "qabul qilindi."
                        ),
                    ),
                ],
            ),
            (
                patients[3],
                superadmin,
                [
                    (
                        superadmin,
                        (
                            "Demo tizimdagi "
                            "xabarlar modulini "
                            "tekshirish uchun "
                            "test xabar."
                        ),
                    ),
                ],
            ),
        ]


        for (
            patient,
            staff,
            messages,
        ) in chat_specs:
            thread, _ = (
                ChatThread.objects.get_or_create(
                    patient=patient,
                    staff=staff,
                )
            )


            latest_message = None

            for (
                sender,
                body,
            ) in messages:
                message, _ = (
                    ChatMessage.objects.get_or_create(
                        thread=thread,
                        sender=sender,
                        body=body,
                        defaults={
                            "is_read":
                                False,
                        },
                    )
                )

                latest_message = (
                    message
                )


            if latest_message:
                thread.last_message_at = (
                    latest_message.created_at
                    or timezone.now()
                )

                thread.save(
                    update_fields=[
                        "last_message_at",
                        "updated_at",
                    ]
                )


    @staticmethod
    def _upsert_user(
        *,
        email,
        phone,
        first_name,
        last_name,
        role,
        doctor_type=None,
        is_staff=False,
        is_superuser=False,
    ):
        user, _ = (
            User.objects.get_or_create(
                email=email,
                defaults={
                    "phone":
                        phone,
                    "first_name":
                        first_name,
                    "last_name":
                        last_name,
                    "role":
                        role,
                    "doctor_type":
                        doctor_type,
                    "is_active":
                        True,
                    "is_staff":
                        is_staff,
                    "is_superuser":
                        is_superuser,
                },
            )
        )


        user.phone = phone
        user.first_name = first_name
        user.last_name = last_name

        user.role = role
        user.doctor_type = (
            doctor_type
        )

        user.is_active = True
        user.is_staff = is_staff
        user.is_superuser = (
            is_superuser
        )

        user.set_password(
            DEMO_PASSWORD
        )

        user.save()

        return user
