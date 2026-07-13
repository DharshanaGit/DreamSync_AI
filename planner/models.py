from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # Custom fields can be added here if needed in the future
    pass

class Goal(models.Model):
    PRIORITY_CHOICES = [
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goals')
    name = models.CharField(max_length=200)
    target_date = models.DateField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    daily_study_hours = models.DecimalField(max_digits=4, decimal_places=1, default=2.0)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.user.username})"

class Task(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
    ]
    PRIORITY_CHOICES = [
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    goal = models.ForeignKey(Goal, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    title = models.CharField(max_length=255)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.status}"

class PlannerSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='planner_settings')
    wake_up_time = models.TimeField(default="06:00:00")
    sleep_time = models.TimeField(default="22:30:00")
    college_office_start = models.TimeField(default="08:00:00")
    college_office_end = models.TimeField(default="17:00:00")
    free_hours = models.IntegerField(default=3) # daily study/free hours target
    weekend_availability = models.IntegerField(default=6) # hours target on weekends

    def __str__(self):
        return f"PlannerSettings for {self.user.username}"

class ScheduleItem(models.Model):
    TYPE_CHOICES = [
        ('SLEEP', 'Sleep'),
        ('EXERCISE', 'Exercise'),
        ('WORK_COLLEGE', 'Work/College'),
        ('REST', 'Rest'),
        ('STUDY', 'Study'),
        ('REVISION', 'Revision'),
        ('OTHER', 'Other'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='schedule_items')
    title = models.CharField(max_length=200)
    start_time = models.TimeField()
    end_time = models.TimeField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    is_weekend = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.title} ({self.start_time} - {self.end_time})"

class Habit(models.Model):
    CATEGORY_CHOICES = [
        ('READING', 'Reading'),
        ('EXERCISE', 'Exercise'),
        ('CODING', 'Coding'),
        ('WATER', 'Water'),
        ('SLEEP', 'Sleep'),
        ('MEDITATION', 'Meditation'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='habits')
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.category})"

class HabitLog(models.Model):
    habit = models.ForeignKey(Habit, on_delete=models.CASCADE, related_name='logs')
    date = models.DateField()
    completed = models.BooleanField(default=False)
    value = models.IntegerField(default=0) # e.g., ml of water, hours of sleep, etc.

    class Meta:
        unique_together = ('habit', 'date')

    def __str__(self):
        return f"{self.habit.name} on {self.date}: {self.completed}"
