from datetime import date, time
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from planner.models import Goal, Task, PlannerSettings, ScheduleItem
from planner.utils import generate_smart_schedule, time_to_minutes

User = get_user_model()

class PlannerAlgorithmTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.settings = PlannerSettings.objects.create(
            user=self.user,
            wake_up_time="06:00:00",
            sleep_time="22:00:00",
            college_office_start="09:00:00",
            college_office_end="17:00:00",
            free_hours=3,
            weekend_availability=5
        )
        self.goal = Goal.objects.create(
            user=self.user,
            name='Learn React',
            target_date=date.today(),
            priority='HIGH',
            daily_study_hours=2.0
        )

    def test_schedule_generation_slots(self):
        """
        Verifies that the smart planner generates schedule items and they don't overlap.
        """
        # Run generation
        generate_smart_schedule(self.user)

        # Get generated items
        weekday_items = ScheduleItem.objects.filter(user=self.user, is_weekend=False).order_by('start_time')
        weekend_items = ScheduleItem.objects.filter(user=self.user, is_weekend=True).order_by('start_time')

        # Check that we have created items
        self.assertTrue(weekday_items.exists())
        self.assertTrue(weekend_items.exists())

        # Check sleep blocks are created
        weekday_sleep = weekday_items.filter(type='SLEEP')
        self.assertTrue(weekday_sleep.exists())

        # Verify that there are no overlapping intervals in the generated weekday items
        def check_overlaps(items):
            prev_end = None
            for item in items:
                start = time_to_minutes(item.start_time)
                end = time_to_minutes(item.end_time)
                if end == 0:
                    end = 1440
                
                # Check interval consistency
                self.assertLess(start, end, f"Start time {item.start_time} must be less than end time {item.end_time}")
                
                # Check overlapping with previous
                if prev_end is not None:
                    self.assertEqual(start, prev_end, f"Overlap or gap detected between {prev_end} and {start}")
                
                prev_end = end if end != 1440 else 0

        # The timeline coalescing creates consecutive blocks from 00:00 to 24:00 (1440 mins total)
        # So checking sequential starts and ends should match perfectly
        check_overlaps(weekday_items)
        check_overlaps(weekend_items)


class AuthenticationAPITests(APITestCase):
    def setUp(self):
        self.register_url = reverse('api_register')
        self.token_obtain_url = reverse('token_obtain_pair')
        self.user_data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'securepassword123'
        }

    def test_user_registration_and_login(self):
        """
        Verify that a user can successfully register and obtain a JWT access token.
        """
        # 1. Register user
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['username'], 'newuser')
        
        # Verify planner settings were auto-created
        user = User.objects.get(username='newuser')
        self.assertTrue(PlannerSettings.objects.filter(user=user).exists())

        # 2. Login to get token
        login_data = {
            'username': 'newuser',
            'password': 'securepassword123'
        }
        response = self.client.post(self.token_obtain_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
