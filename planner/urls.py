from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from planner.views import (
    LandingView, LoginView, DashboardView, GoalsView, PlannerView, HabitsView, ProgressView,
    RegisterView, UserProfileView, GoalViewSet, TaskViewSet, PlannerSettingsView, ScheduleViewSet,
    HabitViewSet, AnalyticsView
)

router = DefaultRouter()
router.register(r'goals', GoalViewSet, basename='goal')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'planner/schedule', ScheduleViewSet, basename='schedule')
router.register(r'habits', HabitViewSet, basename='habit')

urlpatterns = [
    # Page Template Views
    path('', LandingView.as_view(), name='landing'),
    path('login/', LoginView.as_view(), name='login'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('goals/', GoalsView.as_view(), name='goals'),
    path('planner/', PlannerView.as_view(), name='planner'),
    path('habits/', HabitsView.as_view(), name='habits'),
    path('progress/', ProgressView.as_view(), name='progress'),

    # DRF API endpoints
    path('api/', include(router.urls)),
    path('api/auth/register/', RegisterView.as_view(), name='api_register'),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/user/', UserProfileView.as_view(), name='api_user_profile'),
    path('api/planner/settings/', PlannerSettingsView.as_view(), name='api_planner_settings'),
    path('api/analytics/', AnalyticsView.as_view(), name='api_analytics'),
]
