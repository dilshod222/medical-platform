from django.db.models import Q
from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DoctorType, User
from .permissions import (
    IsAdminOrSuperAdmin,
    IsDoctor,
    IsSuperAdmin,
)
from .serializers import (
    DoctorTypeSerializer,
    LoginCredentialsUpdateSerializer,
    LoginSerializer,
    ManagementUserSerializer,
    PasswordChangeSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class LoginCredentialsUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = LoginCredentialsUpdateSerializer(
            request.user,
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "detail": "Login ma’lumotlari yangilandi.",
                "user": UserSerializer(user).data,
            }
        )


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "detail": (
                    "Parol muvaffaqiyatli yangilandi. "
                    "Yangi parol bilan qayta kiring."
                )
            }
        )


class DoctorPatientListView(generics.ListAPIView):
    serializer_class = ManagementUserSerializer
    permission_classes = [IsDoctor]

    def get_queryset(self):
        queryset = User.objects.filter(
            role=User.Role.PATIENT
        ).select_related("doctor_type").order_by("-created_at")

        search = self.request.query_params.get("q")

        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
            )

        return queryset


class ManagementUserListView(generics.ListAPIView):
    serializer_class = ManagementUserSerializer
    permission_classes = [IsAdminOrSuperAdmin]

    def get_queryset(self):
        queryset = User.objects.select_related(
            "doctor_type"
        ).all().order_by("-created_at")

        search = self.request.query_params.get("q")

        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
            )

        return queryset


class ManagementRoleUpdateView(APIView):
    permission_classes = [IsSuperAdmin]

    def patch(self, request, pk):
        target_user = get_object_or_404(
            User,
            pk=pk,
        )

        new_role = request.data.get("role")

        if target_user == request.user:
            return Response(
                {
                    "detail": "O‘z rolingizni o‘zgartira olmaysiz."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target_user.role == User.Role.SUPERADMIN:
            return Response(
                {
                    "detail": "Superadmin rolini bu panel orqali o‘zgartirib bo‘lmaydi."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        allowed_roles = (
            User.Role.PATIENT,
            User.Role.DOCTOR,
            User.Role.ADMIN,
        )

        if new_role not in allowed_roles:
            return Response(
                {
                    "detail": "Ushbu rolni berishga ruxsat yo‘q."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_user.role = new_role

        if new_role == User.Role.DOCTOR:
            doctor_type_id = request.data.get("doctor_type_id")

            if not doctor_type_id:
                return Response(
                    {
                        "detail": "Doktor roli uchun doktor turini tanlash shart."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            doctor_type = get_object_or_404(
                DoctorType,
                pk=doctor_type_id,
                is_active=True,
            )

            target_user.doctor_type = doctor_type
            target_user.is_staff = False

        elif new_role == User.Role.ADMIN:
            target_user.doctor_type = None
            target_user.is_staff = False

        else:
            target_user.doctor_type = None
            target_user.is_staff = False

        target_user.save()

        serializer = ManagementUserSerializer(
            target_user
        )

        return Response(serializer.data)


class DoctorTypeListCreateView(generics.ListCreateAPIView):
    serializer_class = DoctorTypeSerializer
    permission_classes = [IsAdminOrSuperAdmin]

    def get_queryset(self):
        queryset = DoctorType.objects.all().order_by("name")

        if self.request.user.role == User.Role.ADMIN:
            queryset = queryset.filter(is_active=True)

        return queryset

    def create(self, request, *args, **kwargs):
        if request.user.role != User.Role.SUPERADMIN:
            return Response(
                {
                    "detail": "Doktor turini faqat Superadmin yaratishi mumkin."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DoctorTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DoctorType.objects.all()
    serializer_class = DoctorTypeSerializer
    permission_classes = [IsAdminOrSuperAdmin]

    def update(self, request, *args, **kwargs):
        if request.user.role != User.Role.SUPERADMIN:
            return Response(
                {
                    "detail": "Doktor turini faqat Superadmin o‘zgartira oladi."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != User.Role.SUPERADMIN:
            return Response(
                {
                    "detail": "Doktor turini faqat Superadmin o‘chira oladi."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        instance = self.get_object()

        if instance.doctors.filter(role=User.Role.DOCTOR).exists():
            return Response(
                {
                    "detail": (
                        "Bu doktor turi hozir doktorlarga biriktirilgan. "
                        "Avval ularni boshqa turga o‘tkazing."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)
