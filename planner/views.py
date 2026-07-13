import datetime
from django.shortcuts import render
from django.views.generic import TemplateView
from django.db.models import Count, Q
from rest_framework import viewsets, generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import get_user_model

from planner.models import Goal, Task, PlannerSettings, ScheduleItem, Habit, HabitLog
from planner.serializers import (
    UserSerializer, RegisterSerializer, GoalSerializer, TaskSerializer,
    PlannerSettingsSerializer, ScheduleItemSerializer, HabitSerializer, HabitLogSerializer
)
from planner.utils import generate_smart_schedule

User = get_user_model()

# ==========================================
# 1. Django Page Views (Serve HTML Templates)
# ==========================================

class LandingView(TemplateView):
    template_name = 'landing.html'

class LoginView(TemplateView):
    template_name = 'login.html'

class DashboardView(TemplateView):
    template_name = 'dashboard.html'

class GoalsView(TemplateView):
    template_name = 'goals.html'

class PlannerView(TemplateView):
    template_name = 'planner.html'

class HabitsView(TemplateView):
    template_name = 'habits.html'

class ProgressView(TemplateView):
    template_name = 'progress.html'


# ==========================================
# 2. REST API Views (Django REST Framework)
# ==========================================

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class UserProfileView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user


class GoalViewSet(viewsets.ModelViewSet):
    serializer_class = GoalSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Goal.objects.filter(user=self.request.user).order_by('-priority', 'created_at')

    def perform_destroy(self, instance):
        # When goal is deleted, we should update schedule to remove it
        user = instance.user
        instance.delete()
        generate_smart_schedule(user)


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        queryset = Task.objects.filter(user=self.request.user).order_by('due_date', '-priority')
        goal_id = self.request.query_params.get('goal_id')
        status_param = self.request.query_params.get('status')
        priority = self.request.query_params.get('priority')
        
        if goal_id:
            queryset = queryset.filter(goal_id=goal_id)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if priority:
            queryset = queryset.filter(priority=priority)
            
        return queryset


class PlannerSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = PlannerSettingsSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        settings, created = PlannerSettings.objects.get_or_create(user=self.request.user)
        return settings

    def perform_update(self, serializer):
        # Update settings and automatically regenerate schedule
        settings = serializer.save()
        generate_smart_schedule(self.request.user)


class ScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleItemSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return ScheduleItem.objects.filter(user=self.request.user).order_by('start_time')

    @action(detail=False, methods=['post'])
    def regenerate(self, request):
        generate_smart_schedule(request.user)
        schedule = self.get_queryset()
        serializer = self.get_serializer(schedule, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class HabitViewSet(viewsets.ModelViewSet):
    serializer_class = HabitSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Habit.objects.filter(user=self.request.user).prefetch_related('logs').order_by('created_at')

    @action(detail=False, methods=['post'])
    def log(self, request):
        habit_id = request.data.get('habit_id')
        log_date_str = request.data.get('date')
        completed = request.data.get('completed', False)
        value = request.data.get('value', 0)

        if not habit_id or not log_date_str:
            return Response({'error': 'habit_id and date are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            habit = Habit.objects.get(id=habit_id, user=request.user)
            log_date = datetime.datetime.strptime(log_date_str, '%Y-%m-%d').date()
        except Habit.DoesNotExist:
            return Response({'error': 'Habit not found.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        log, created = HabitLog.objects.update_or_create(
            habit=habit,
            date=log_date,
            defaults={'completed': completed, 'value': value}
        )

        return Response(HabitLogSerializer(log).data, status=status.HTTP_200_OK)


class AnalyticsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        today = datetime.date.today()
        
        # 1. Goal Completion Stats
        total_goals = Goal.objects.filter(user=user).count()
        completed_goals = Goal.objects.filter(user=user, is_completed=True).count()
        
        # 2. Task Completion Stats
        total_tasks = Task.objects.filter(user=user).count()
        completed_tasks = Task.objects.filter(user=user, status='COMPLETED').count()
        pending_tasks = Task.objects.filter(user=user, status='PENDING').count()
        in_progress_tasks = Task.objects.filter(user=user, status='IN_PROGRESS').count()

        # 3. Habit Log analytics for past 7 days
        last_7_days = [today - datetime.timedelta(days=i) for i in range(7)]
        last_7_days_str = [str(d) for d in last_7_days]
        last_7_days_str.reverse() # Oldest to newest
        
        habit_history = []
        habits = Habit.objects.filter(user=user)
        
        daily_habit_completion_rate = []
        for d in reversed(last_7_days):
            day_logs = HabitLog.objects.filter(habit__user=user, date=d)
            total_logs = day_logs.count()
            completed_logs = day_logs.filter(completed=True).count()
            rate = int((completed_logs / total_logs) * 100) if total_logs > 0 else 0
            daily_habit_completion_rate.append(rate)
            
        daily_habit_completion_rate.reverse() # Oldest to newest

        # 4. Daily tasks completed history (last 7 days)
        daily_tasks_completed = []
        for d in reversed(last_7_days):
            completed_count = Task.objects.filter(user=user, status='COMPLETED', due_date=d).count()
            daily_tasks_completed.append(completed_count)
        daily_tasks_completed.reverse() # Oldest to newest

        # 5. Study Hours Breakdown
        # Calculate daily study hours based on generated schedule items
        weekday_study_items = ScheduleItem.objects.filter(user=user, type='STUDY', is_weekend=False)
        weekend_study_items = ScheduleItem.objects.filter(user=user, type='STUDY', is_weekend=True)
        
        def calculate_hours(items):
            total_minutes = 0
            for item in items:
                # Calculate time difference in minutes
                t1 = datetime.datetime.combine(datetime.date.min, item.start_time)
                t2 = datetime.datetime.combine(datetime.date.min, item.end_time)
                total_minutes += (t2 - t1).total_seconds() / 60
            return round(total_minutes / 60, 1)

        weekday_study_hours = calculate_hours(weekday_study_items)
        weekend_study_hours = calculate_hours(weekend_study_items)

        # 6. Current Habit Streak
        current_streak = 0
        checking_date = today
        while True:
            # Check if user logged habits for this date
            day_logs = HabitLog.objects.filter(habit__user=user, date=checking_date)
            if not day_logs.exists():
                # Allow today to be unlogged if we are checking today, but if they logged and failed, break
                if checking_date == today:
                    checking_date -= datetime.timedelta(days=1)
                    continue
                else:
                    break
            
            # If logged, did they complete at least 1 habit? Or let's see if completion rate is > 50%
            completed_count = day_logs.filter(completed=True).count()
            if completed_count > 0:
                current_streak += 1
                checking_date -= datetime.timedelta(days=1)
            else:
                break
            
            # Safe limit to prevent infinite loops
            if current_streak > 365:
                break

        response_data = {
            'goals': {
                'total': total_goals,
                'completed': completed_goals,
                'completion_rate': int((completed_goals / total_goals) * 100) if total_goals > 0 else 0
            },
            'tasks': {
                'total': total_tasks,
                'completed': completed_tasks,
                'pending': pending_tasks,
                'in_progress': in_progress_tasks,
                'completion_rate': int((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0
            },
            'study_hours': {
                'weekday': weekday_study_hours,
                'weekend': weekend_study_hours,
                'total_weekly': round((weekday_study_hours * 5) + (weekend_study_hours * 2), 1)
            },
            'streak': current_streak,
            'charts': {
                'labels': last_7_days_str,
                'habit_completion': daily_habit_completion_rate,
                'tasks_completed': daily_tasks_completed
            }
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
