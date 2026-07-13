from rest_framework import serializers
from django.contrib.auth import get_user_model
from planner.models import Goal, Task, PlannerSettings, ScheduleItem, Habit, HabitLog

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        # Create default planner settings for new user
        PlannerSettings.objects.create(user=user)
        return user

class GoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Goal
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at')

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class TaskSerializer(serializers.ModelSerializer):
    goal_name = serializers.CharField(source='goal.name', read_only=True)

    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at')

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class PlannerSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlannerSettings
        fields = '__all__'
        read_only_fields = ('id', 'user')

class ScheduleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleItem
        fields = '__all__'
        read_only_fields = ('id', 'user')

class HabitLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = HabitLog
        fields = '__all__'

class HabitSerializer(serializers.ModelSerializer):
    # Include logs for a date range if needed, or serialize them nested
    logs = HabitLogSerializer(many=True, read_only=True)
    weekly_history = serializers.SerializerMethodField()

    class Meta:
        model = Habit
        fields = ('id', 'user', 'name', 'category', 'created_at', 'logs', 'weekly_history')
        read_only_fields = ('id', 'user', 'created_at')

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

    def get_weekly_history(self, obj):
        # Returns a dict of date -> completed (boolean) for the last 7 days
        import datetime
        today = datetime.date.today()
        history = {}
        for i in range(7):
            d = today - datetime.timedelta(days=i)
            log = obj.logs.filter(date=d).first()
            history[str(d)] = {
                'completed': log.completed if log else False,
                'value': log.value if log else 0,
                'log_id': log.id if log else None
            }
        return history
