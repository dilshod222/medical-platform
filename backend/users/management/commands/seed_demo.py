import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from chat.models import ChatMessage, ChatThread
from questionnaires.models import Question, QuestionAnswer, QuestionOption
from users.models import DoctorType, User


DOCTOR_TYPES = [
    ("Terapevt", "Umumiy terapevtik ko‘rik va birlamchi maslahat."),
    ("Kardiolog", "Yurak-qon tomir tizimi bo‘yicha mutaxassis."),
    ("Nevrolog", "Asab tizimi kasalliklari bo‘yicha mutaxassis."),
    ("Pediatr", "Bolalar salomatligi bo‘yicha mutaxassis."),
    ("Endokrinolog", "Endokrin tizim va gormonal holatlar bo‘yicha mutaxassis."),
    ("Gastroenterolog", "Oshqozon-ichak tizimi bo‘yicha mutaxassis."),
    ("Dermatolog", "Teri kasalliklari bo‘yicha mutaxassis."),
    ("LOR", "Quloq, burun va tomoq kasalliklari bo‘yicha mutaxassis."),
    ("Oftalmolog", "Ko‘z va ko‘rish tizimi bo‘yicha mutaxassis."),
    ("Urolog", "Siydik chiqarish tizimi bo‘yicha mutaxassis."),
    ("Pulmonolog", "Nafas olish tizimi bo‘yicha mutaxassis."),
    ("Revmatolog", "Bo‘g‘im va revmatik kasalliklar bo‘yicha mutaxassis."),
]


QUESTION_SPECS = [
    {
        "key": "birth_date",
        "text": "Tug‘ilgan sanangizni kiriting",
        "type": Question.QuestionType.DATE,
        "required": True,
        "options": [],
    },
    {
        "key": "address",
        "text": "Yashash manzilingizni yozing",
        "type": Question.QuestionType.TEXTAREA,
        "required": True,
        "options": [],
    },
    {
        "key": "main_complaint",
        "text": "Asosiy shikoyatingiz yoki murojaat sababini yozing",
        "type": Question.QuestionType.TEXTAREA,
        "required": True,
        "options": [],
    },
    {
        "key": "complaint_start",
        "text": "Ushbu shikoyat qachondan boshlangan?",
        "type": Question.QuestionType.DATE,
        "required": True,
        "options": [],
    },
    {
        "key": "symptoms",
        "text": "Hozir sizda qaysi belgilar mavjud?",
        "type": Question.QuestionType.CHECKBOX,
        "required": True,
        "options": [
            "Bosh og‘rig‘i",
            "Isitma",
            "Yo‘tal",
            "Holsizlik",
            "Ko‘ngil aynishi",
            "Qorin og‘rig‘i",
            "Nafas qisishi",
            "Bosh aylanishi",
        ],
    },
    {
        "key": "chronic",
        "text": "Surunkali kasalligingiz bormi?",
        "type": Question.QuestionType.RADIO,
        "required": True,
        "options": ["Ha", "Yo‘q"],
    },
    {
        "key": "chronic_details",
        "text": "Agar surunkali kasalligingiz bo‘lsa, batafsil yozing",
        "type": Question.QuestionType.TEXTAREA,
        "required": False,
        "options": [],
    },
    {
        "key": "allergy",
        "text": "Allergiya holatingizni tanlang",
        "type": Question.QuestionType.SELECT,
        "required": True,
        "options": [
            "Allergiya yo‘q",
            "Dori vositalariga",
            "Oziq-ovqatga",
            "Chang yoki gul changiga",
            "Boshqa",
        ],
    },
    {
        "key": "allergy_details",
        "text": "Allergiyangiz bo‘lsa, nimaga ekanini yozing",
        "type": Question.QuestionType.TEXTAREA,
        "required": False,
        "options": [],
    },
    {
        "key": "medications",
        "text": "Doimiy ravishda dori qabul qilasizmi?",
        "type": Question.QuestionType.RADIO,
        "required": True,
        "options": ["Ha", "Yo‘q"],
    },
    {
        "key": "medication_names",
        "text": "Qabul qilayotgan dori vositalaringizni yozing",
        "type": Question.QuestionType.TEXTAREA,
        "required": False,
        "options": [],
    },
    {
        "key": "surgeries",
        "text": "Oldin jarrohlik amaliyoti o‘tkazganmisiz?",
        "type": Question.QuestionType.RADIO,
        "required": True,
        "options": ["Ha", "Yo‘q"],
    },
    {
        "key": "smoking",
        "text": "Chekish bo‘yicha holatingizni tanlang",
        "type": Question.QuestionType.SELECT,
        "required": True,
        "options": [
            "Chekmayman",
            "Oldin chekkanman",
            "Hozir chekaman",
        ],
    },
    {
        "key": "activity",
        "text": "Jismoniy faollik darajangiz qanday?",
        "type": Question.QuestionType.SELECT,
        "required": True,
        "options": ["Past", "O‘rtacha", "Yuqori"],
    },
    {
        "key": "blood_group",
        "text": "Qon guruhingizni bilsangiz tanlang",
        "type": Question.QuestionType.SELECT,
        "required": False,
        "options": ["O(I)+", "O(I)-", "A(II)+", "A(II)-", "B(III)+", "B(III)-", "AB(IV)+", "AB(IV)-"],
    },
    {
        "key": "blood_pressure",
        "text": "Qon bosimingiz odatda qanday bo‘ladi?",
        "type": Question.QuestionType.SELECT,
        "required": False,
        "options": ["Odatda normal", "Ko‘tarilib turadi", "Past bo‘lib turadi", "Bilmayman"],
    },
    {
        "key": "family_history",
        "text": "Yaqin qarindoshlaringizda qaysi kasalliklar uchraydi?",
        "type": Question.QuestionType.CHECKBOX,
        "required": False,
        "options": [
            "Yurak-qon tomir kasalliklari",
            "Qandli diabet",
            "Onkologik kasalliklar",
            "Qon bosimi yuqoriligi",
            "Irsiy kasallik ma’lum emas",
        ],
    },
    {
        "key": "infectious_contact",
        "text": "So‘nggi 14 kunda yuqumli kasalligi bo‘lgan inson bilan yaqin aloqada bo‘lganmisiz?",
        "type": Question.QuestionType.RADIO,
        "required": False,
        "options": ["Ha", "Yo‘q", "Bilmayman"],
    },
    {
        "key": "previous_exams",
        "text": "Oxirgi tibbiy tekshiruvlaringiz yoki tahlillaringiz haqida qisqacha yozing",
        "type": Question.QuestionType.TEXTAREA,
        "required": False,
        "options": [],
    },
    {
        "key": "additional",
        "text": "Doktor bilishi kerak deb hisoblagan qo‘shimcha ma’lumotni yozing",
        "type": Question.QuestionType.TEXTAREA,
        "required": False,
        "options": [],
    },
]


PATIENT_FIRST_NAMES = [
    "Aziz", "Madina", "Jasur", "Dilnoza", "Bekzod",
    "Shahnoza", "Sardor", "Malika", "Akmal", "Nilufar",
    "Oybek", "Mohira", "Diyor", "Zarnigor", "Sherzod",
    "Nodira", "Abror", "Sevara", "Kamron", "Gulnoza",
]

PATIENT_LAST_NAMES = [
    "Karimov", "Rasulova", "Tursunov", "Ismoilova", "Nazarov",
    "Qodirova", "Saidov", "Rahimova", "Yusupov", "Ergasheva",
    "Abdullayev", "Mirzayeva", "Hamroyev", "Sattorova", "Olimov",
    "Usmonova", "Jumanov", "Shukurova", "Ortiqov", "Sobirova",
]

DOCTOR_NAMES = [
    ("Rustam", "Hakimov"),
    ("Umida", "Salimova"),
    ("Javlon", "Murodov"),
    ("Dildora", "Anvarova"),
    ("Akbar", "Nematov"),
    ("Farida", "Komilova"),
    ("Timur", "Raxmatov"),
    ("Saida", "Norova"),
]

ADMIN_NAMES = [
    ("Sardor", "Adminov"),
    ("Malika", "Adminova"),
    ("Komil", "Operatorov"),
]

DISTRICTS = [
    "Toshkent shahri, Mirzo Ulug‘bek tumani",
    "Toshkent shahri, Yunusobod tumani",
    "Toshkent shahri, Chilonzor tumani",
    "Toshkent shahri, Yashnobod tumani",
    "Toshkent shahri, Shayxontohur tumani",
    "Toshkent shahri, Olmazor tumani",
    "Toshkent shahri, Sergeli tumani",
    "Toshkent shahri, Uchtepa tumani",
]

COMPLAINTS = [
    "Bosh og‘rig‘i va tez charchash",
    "Yo‘tal va tomoq og‘rig‘i",
    "Qorin sohasida og‘riq",
    "Qon bosimi ko‘tarilib turishi",
    "Bosh aylanishi va holsizlik",
    "Bel sohasida og‘riq",
    "Uyqu buzilishi va charchoq",
    "Allergik toshmalar",
    "Yurak urishining tezlashishi",
    "Ovqatdan keyin oshqozonda og‘irlik",
]

CHRONIC_DETAILS = [
    "Arterial gipertoniya nazorat ostida.",
    "Surunkali gastrit bo‘yicha kuzatuvda.",
    "Mavsumiy allergiya kuzatiladi.",
    "Surunkali kasallik qayd etilmagan.",
]


class Command(BaseCommand):
    help = (
        "Local development uchun sintetik demo ma’lumotlar yaratadi: "
        "bemorlar, doktorlar, adminlar, doktor turlari, savollar va tibbiy javoblar."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--patients",
            type=int,
            default=20,
            help="Yaratiladigan demo bemorlar soni (default: 20).",
        )
        parser.add_argument(
            "--doctors",
            type=int,
            default=6,
            help="Yaratiladigan demo doktorlar soni (default: 6).",
        )
        parser.add_argument(
            "--admins",
            type=int,
            default=2,
            help="Yaratiladigan demo adminlar soni (default: 2).",
        )
        parser.add_argument(
            "--password",
            default="Demo12345!",
            help="Barcha demo akkauntlar uchun parol.",
        )
        parser.add_argument(
            "--reset-demo",
            action="store_true",
            help="Avval faqat seed_demo yaratgan demo akkauntlar va ularning javoblarini o‘chiradi.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        patient_count = options["patients"]
        doctor_count = options["doctors"]
        admin_count = options["admins"]
        password = options["password"]

        for value, label in (
            (patient_count, "patients"),
            (doctor_count, "doctors"),
            (admin_count, "admins"),
        ):
            if value < 0 or value > 100:
                raise CommandError(f"--{label} 0 va 100 oralig‘ida bo‘lishi kerak.")

        if options["reset_demo"]:
            self._reset_demo_users()

        superadmin = User.objects.filter(
            role=User.Role.SUPERADMIN
        ).order_by("id").first()

        doctor_types = self._seed_doctor_types(superadmin)
        questions = self._seed_questions(superadmin)

        patients = self._seed_patients(patient_count, password)
        doctors = self._seed_doctors(doctor_count, password, doctor_types)
        admins = self._seed_admins(admin_count, password)

        self._seed_medical_answers(patients, questions)
        chat_thread_count, chat_message_count = self._seed_chat_messages(
            patients,
            doctors,
            admins,
        )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Demo ma’lumotlar tayyor."))
        self.stdout.write(f"  Bemorlar:       {len(patients)}")
        self.stdout.write(f"  Doktorlar:      {len(doctors)}")
        self.stdout.write(f"  Adminlar:       {len(admins)}")
        self.stdout.write(f"  Doktor turlari: {len(doctor_types)}")
        self.stdout.write(f"  Savollar:       {len(questions)}")
        self.stdout.write(f"  Yozishmalar:    {chat_thread_count}")
        self.stdout.write(f"  Xabarlar:       {chat_message_count}")
        self.stdout.write("")
        self.stdout.write("Test parol (barcha demo akkauntlar):")
        self.stdout.write(self.style.WARNING(f"  {password}"))
        self.stdout.write("")
        if patients:
            self.stdout.write(f"Bemor:  {patients[0].email} / {patients[0].phone}")
        if doctors:
            self.stdout.write(f"Doktor: {doctors[0].email} / {doctors[0].phone}")
        if admins:
            self.stdout.write(f"Admin:  {admins[0].email} / {admins[0].phone}")
        self.stdout.write("")
        self.stdout.write(
            self.style.WARNING(
                "Eslatma: bu ma’lumotlar faqat local/staging test uchun. Productionda seed_demo ishlatmang."
            )
        )

    def _reset_demo_users(self):
        demo_users = User.objects.filter(email__endswith="@demo.medconnect.uz")
        count = demo_users.count()
        demo_users.delete()
        self.stdout.write(f"Oldingi demo akkauntlar o‘chirildi: {count}")

    def _seed_doctor_types(self, superadmin):
        result = []

        for name, description in DOCTOR_TYPES:
            doctor_type, _ = DoctorType.objects.update_or_create(
                name=name,
                defaults={
                    "description": description,
                    "is_active": True,
                },
            )

            if doctor_type.created_by_id is None and superadmin:
                doctor_type.created_by = superadmin
                doctor_type.save(update_fields=["created_by"])

            result.append(doctor_type)

        return result

    def _seed_questions(self, superadmin):
        result = {}

        for order, spec in enumerate(QUESTION_SPECS):
            question, _ = Question.objects.update_or_create(
                text=spec["text"],
                defaults={
                    "question_type": spec["type"],
                    "is_required": spec["required"],
                    "is_active": True,
                    "order": order,
                    "created_by": superadmin,
                },
            )

            question.options.all().delete()

            for option_order, option_text in enumerate(spec["options"]):
                QuestionOption.objects.create(
                    question=question,
                    text=option_text,
                    order=option_order,
                )

            result[spec["key"]] = question

        return result

    def _seed_patients(self, count, password):
        users = []

        for index in range(1, count + 1):
            first_name = PATIENT_FIRST_NAMES[(index - 1) % len(PATIENT_FIRST_NAMES)]
            last_name = PATIENT_LAST_NAMES[(index - 1) % len(PATIENT_LAST_NAMES)]

            user = self._upsert_user(
                email=f"patient{index:02d}@demo.medconnect.uz",
                phone=f"+99890{1000000 + index:07d}",
                first_name=first_name,
                last_name=last_name,
                role=User.Role.PATIENT,
                password=password,
                doctor_type=None,
                is_staff=False,
            )

            users.append(user)

        return users

    def _seed_doctors(self, count, password, doctor_types):
        users = []

        for index in range(1, count + 1):
            first_name, last_name = DOCTOR_NAMES[(index - 1) % len(DOCTOR_NAMES)]
            doctor_type = doctor_types[(index - 1) % len(doctor_types)]

            user = self._upsert_user(
                email=f"doctor{index:02d}@demo.medconnect.uz",
                phone=f"+99891{2000000 + index:07d}",
                first_name=first_name,
                last_name=last_name,
                role=User.Role.DOCTOR,
                password=password,
                doctor_type=doctor_type,
                is_staff=False,
            )

            users.append(user)

        return users

    def _seed_admins(self, count, password):
        users = []

        for index in range(1, count + 1):
            first_name, last_name = ADMIN_NAMES[(index - 1) % len(ADMIN_NAMES)]

            user = self._upsert_user(
                email=f"admin{index:02d}@demo.medconnect.uz",
                phone=f"+99893{3000000 + index:07d}",
                first_name=first_name,
                last_name=last_name,
                role=User.Role.ADMIN,
                password=password,
                doctor_type=None,
                is_staff=True,
            )

            users.append(user)

        return users

    @staticmethod
    def _upsert_user(
        *,
        email,
        phone,
        first_name,
        last_name,
        role,
        password,
        doctor_type,
        is_staff,
    ):
        user, _ = User.objects.get_or_create(
            email=email,
            defaults={
                "phone": phone,
                "first_name": first_name,
                "last_name": last_name,
                "role": role,
                "doctor_type": doctor_type,
                "is_active": True,
                "is_staff": is_staff,
            },
        )

        user.phone = phone
        user.first_name = first_name
        user.last_name = last_name
        user.role = role
        user.doctor_type = doctor_type
        user.is_active = True
        user.is_staff = is_staff
        user.is_superuser = False
        user.set_password(password)
        user.save()

        return user

    def _seed_medical_answers(self, patients, questions):
        random.seed(20260905)

        for patient_index, patient in enumerate(patients, start=1):
            incomplete = patient_index % 4 == 0

            for spec_index, spec in enumerate(QUESTION_SPECS):
                question = questions[spec["key"]]

                # Har 4-bemorni ataylab qisman to‘ldirilgan holatda qoldiramiz.
                if incomplete and spec["required"] and spec_index >= 8:
                    QuestionAnswer.objects.filter(
                        user=patient,
                        question=question,
                    ).delete()
                    continue

                value = self._build_answer(
                    patient_index,
                    spec["key"],
                    question,
                )

                if value in (None, "", []):
                    QuestionAnswer.objects.filter(
                        user=patient,
                        question=question,
                    ).delete()
                    continue

                QuestionAnswer.objects.update_or_create(
                    user=patient,
                    question=question,
                    defaults={"value": value},
                )


    def _seed_chat_messages(self, patients, doctors, admins):
        if not patients or not doctors:
            return 0, 0

        thread_count = 0
        message_count = 0

        demo_texts = [
            "Assalomu alaykum. Tibbiy anketangiz bilan tanishib chiqdim.",
            "Ko‘rsatgan belgilaringiz bo‘yicha holatingizni kuzatib boring.",
            "Agar holatingiz yomonlashsa, shifokorga bevosita murojaat qiling.",
            "Ko‘proq suyuqlik iching va dam olish rejimiga rioya qiling.",
            "Qon bosimingizni kuniga ikki marta o‘lchab, natijani qayd etib boring.",
            "Tavsiyalarni bajarganingizdan keyin holatingizni qayta baholash kerak bo‘ladi.",
        ]

        # Har bir doktorga kamida ikki bemor biriktirib, turli yozishmalar yaratamiz.
        pairs = []
        pair_target = min(max(12, len(doctors) * 2), len(patients) * len(doctors))

        doctor_index = 0
        patient_index = 0

        while len(pairs) < pair_target:
            pair = (
                doctors[doctor_index % len(doctors)],
                patients[patient_index % len(patients)],
            )

            if pair not in pairs:
                pairs.append(pair)

            doctor_index += 1
            patient_index += 2

            if doctor_index > 500:
                break

        # Adminlar ham bemorlarga bevosita xizmat xabarini yubora olishini test qilamiz.
        for index, admin in enumerate(admins[:2]):
            if patients:
                pairs.append((admin, patients[(index + 3) % len(patients)]))

        for pair_index, (staff, patient) in enumerate(pairs):
            thread, _ = ChatThread.objects.get_or_create(
                patient=patient,
                staff=staff,
            )

            thread.messages.all().delete()

            message_total = 2 + (pair_index % 3)
            last_message = None

            for message_index in range(message_total):
                body = demo_texts[(pair_index + message_index) % len(demo_texts)]

                last_message = ChatMessage.objects.create(
                    thread=thread,
                    sender=staff,
                    body=body,
                    is_read=(message_index < message_total - 1),
                )
                message_count += 1

            if last_message:
                thread.last_message_at = last_message.created_at
                thread.save(update_fields=("last_message_at", "updated_at"))

            thread_count += 1

        return thread_count, message_count

    def _build_answer(self, index, key, question):
        options = list(question.options.order_by("order", "id"))

        if key == "birth_date":
            year = 1977 + ((index * 3) % 27)
            month = 1 + ((index * 2) % 12)
            day = 1 + ((index * 5) % 27)
            return date(year, month, day).isoformat()

        if key == "address":
            return DISTRICTS[(index - 1) % len(DISTRICTS)]

        if key == "main_complaint":
            return COMPLAINTS[(index - 1) % len(COMPLAINTS)]

        if key == "complaint_start":
            return (date(2026, 9, 1) - timedelta(days=(index * 3) % 40)).isoformat()

        if key == "symptoms":
            if not options:
                return []
            first = options[(index - 1) % len(options)].id
            second = options[(index + 2) % len(options)].id
            return list(dict.fromkeys([first, second]))

        if key == "chronic":
            return self._option_id(options, 0 if index % 3 == 0 else 1)

        if key == "chronic_details":
            return CHRONIC_DETAILS[(index - 1) % len(CHRONIC_DETAILS)] if index % 3 == 0 else ""

        if key == "allergy":
            choice = 0 if index % 4 else 1 + (index % max(1, len(options) - 1))
            return self._option_id(options, choice)

        if key == "allergy_details":
            return "Penitsillin guruhidagi dori vositalariga sezuvchanlik." if index % 4 == 0 else ""

        if key == "medications":
            return self._option_id(options, 0 if index % 4 == 0 else 1)

        if key == "medication_names":
            return "Shifokor tavsiyasiga ko‘ra qon bosimini nazorat qiluvchi dori." if index % 4 == 0 else ""

        if key == "surgeries":
            return self._option_id(options, 0 if index % 5 == 0 else 1)

        if key == "smoking":
            return self._option_id(options, index % len(options))

        if key == "activity":
            return self._option_id(options, (index + 1) % len(options))

        if key == "blood_group":
            return self._option_id(options, index % len(options))

        if key == "blood_pressure":
            return self._option_id(options, index % len(options))

        if key == "family_history":
            if not options:
                return []
            return [options[index % len(options)].id]

        if key == "infectious_contact":
            return self._option_id(options, 1 if index % 6 else 0)

        if key == "previous_exams":
            return (
                "Umumiy qon tahlili va biokimyoviy tekshiruv o‘tkazilgan. "
                "Natijalar shifokor bilan muhokama qilinishi kerak."
            ) if index % 2 == 0 else ""

        if key == "additional":
            return "Demo bemor uchun sintetik test ma’lumoti." if index % 3 == 0 else ""

        return None

    @staticmethod
    def _option_id(options, index):
        if not options:
            return None
        return options[index % len(options)].id
