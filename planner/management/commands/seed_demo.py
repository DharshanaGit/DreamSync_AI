import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from planner.models import Goal, Task, PlannerSettings, Habit, HabitLog
from planner.utils import generate_smart_schedule

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with high-quality demo data for visual dashboard testing.'

    def handle(self, *args, **options):
        self.stdout.write('Seeding demo data...')

        # 1. Create or get demo user
        username = 'demo'
        email = 'demo@dreamsync.com'
        password = 'password123'
        
        user, created = User.objects.get_or_create(username=username, email=email)
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(f'Created demo user: {username} (password: {password})')
        else:
            self.stdout.write(f'Demo user {username} already exists.')

        # Clean existing user data to ensure clean seed
        Goal.objects.filter(user=user).delete()
        Habit.objects.filter(user=user).delete()
        Task.objects.filter(user=user).delete()
        PlannerSettings.objects.filter(user=user).delete()

        # 2. Create Planner Settings
        settings = PlannerSettings.objects.create(
            user=user,
            wake_up_time="06:00:00",
            sleep_time="22:30:00",
            college_office_start="09:00:00",
            college_office_end="17:00:00",
            free_hours=3,
            weekend_availability=6
        )
        self.stdout.write('Created Planner Settings.')

        # 3. Create Goals
        today = date.today()
        goals_data = [
            {'name': 'Placement Preparation', 'target_date': today + timedelta(days=120), 'priority': 'HIGH', 'daily_study_hours': 2.5, 'is_completed': False},
            {'name': 'Learn React & Redux', 'target_date': today + timedelta(days=30), 'priority': 'MEDIUM', 'daily_study_hours': 1.0, 'is_completed': False},
            {'name': 'UPSC Civil Services', 'target_date': today + timedelta(days=365), 'priority': 'HIGH', 'daily_study_hours': 4.0, 'is_completed': False},
            {'name': 'Learn Django REST Framework', 'target_date': today - timedelta(days=10), 'priority': 'MEDIUM', 'daily_study_hours': 1.5, 'is_completed': True},
        ]
        
        goals = {}
        for g_info in goals_data:
            g = Goal.objects.create(
                user=user,
                name=g_info['name'],
                target_date=g_info['target_date'],
                priority=g_info['priority'],
                daily_study_hours=g_info['daily_study_hours'],
                is_completed=g_info['is_completed']
            )
            goals[g.name] = g
        self.stdout.write('Created Goals (including 1 completed goal).')

        # 4. Generate Smart Schedule
        generate_smart_schedule(user)
        self.stdout.write('Generated Smart Schedule items using algorithm.')

        # 5. Create Tasks
        tasks_data = [
            # Placement Prep
            {'title': 'Solve 5 LeetCode DP Problems', 'goal': goals['Placement Preparation'], 'due_date': today, 'status': 'PENDING', 'priority': 'HIGH'},
            {'title': 'Revise OS Scheduling Algorithms', 'goal': goals['Placement Preparation'], 'due_date': today + timedelta(days=2), 'status': 'PENDING', 'priority': 'MEDIUM'},
            {'title': 'Review resume formatting', 'goal': goals['Placement Preparation'], 'due_date': today - timedelta(days=2), 'status': 'COMPLETED', 'priority': 'HIGH'},
            # Learn React
            {'title': 'Complete hooks and context modules', 'goal': goals['Learn React & Redux'], 'due_date': today + timedelta(days=1), 'status': 'IN_PROGRESS', 'priority': 'MEDIUM'},
            {'title': 'Build a simple Weather App', 'goal': goals['Learn React & Redux'], 'due_date': today + timedelta(days=5), 'status': 'PENDING', 'priority': 'LOW'},
            {'title': 'Create React app boilerplate', 'goal': goals['Learn React & Redux'], 'due_date': today - timedelta(days=5), 'status': 'COMPLETED', 'priority': 'MEDIUM'},
            # UPSC
            {'title': 'Read Laxmikanth Polity Chapters 4-6', 'goal': goals['UPSC Civil Services'], 'due_date': today + timedelta(days=3), 'status': 'PENDING', 'priority': 'HIGH'},
            {'title': 'Summarize current affairs from June', 'goal': goals['UPSC Civil Services'], 'due_date': today + timedelta(days=7), 'status': 'PENDING', 'priority': 'MEDIUM'},
            {'title': 'Attempt History Mock Test 1', 'goal': goals['UPSC Civil Services'], 'due_date': today - timedelta(days=4), 'status': 'COMPLETED', 'priority': 'HIGH'},
            # No Goal (Independent task)
            {'title': 'Buy weekly groceries', 'goal': None, 'due_date': today, 'status': 'PENDING', 'priority': 'LOW'},
            {'title': 'Pay electricity bill', 'goal': None, 'due_date': today + timedelta(days=4), 'status': 'PENDING', 'priority': 'MEDIUM'},
        ]

        for t_info in tasks_data:
            Task.objects.create(
                user=user,
                goal=t_info['goal'],
                title=t_info['title'],
                due_date=t_info['due_date'],
                status=t_info['status'],
                priority=t_info['priority']
            )
        self.stdout.write('Created Tasks.')

        # 6. Create Habits
        habits_data = [
            {'name': 'Read 10 Pages', 'category': 'READING'},
            {'name': 'Cardio Run / Gym', 'category': 'EXERCISE'},
            {'name': 'Solve 1 Code Problem', 'category': 'CODING'},
            {'name': 'Drink 3 Liters Water', 'category': 'WATER'},
            {'name': '7+ Hours Sleep', 'category': 'SLEEP'},
            {'name': '15 mins Meditation', 'category': 'MEDITATION'},
        ]

        habits = []
        for h_info in habits_data:
            h = Habit.objects.create(
                user=user,
                name=h_info['name'],
                category=h_info['category']
            )
            habits.append(h)
        self.stdout.write('Created Habits.')

        # 7. Create Habit Logs for the last 10 days
        # We will make it look realistic with some habits checked off and some not.
        for h in habits:
            # Each habit has a different probability of completion to feel real
            completion_probability = {
                'READING': 0.6,
                'EXERCISE': 0.5,
                'CODING': 0.8,
                'WATER': 0.9,
                'SLEEP': 0.7,
                'MEDITATION': 0.4
            }[h.category]

            for d_offset in range(10):
                log_date = today - timedelta(days=d_offset)
                completed = random.random() < completion_probability
                
                # Setup values where applicable
                val = 0
                if h.category == 'WATER':
                    val = 3000 if completed else random.randint(1000, 2500)
                elif h.category == 'SLEEP':
                    val = random.randint(7, 9) if completed else random.randint(5, 6)
                
                HabitLog.objects.create(
                    habit=h,
                    date=log_date,
                    completed=completed,
                    value=val
                )
        self.stdout.write('Created Habit Logs for the past 10 days.')
        self.stdout.write(self.style.SUCCESS('Successfully seeded all demo data!'))
