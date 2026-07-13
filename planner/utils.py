from datetime import time, datetime
from planner.models import ScheduleItem, Goal, PlannerSettings

def time_to_minutes(t):
    if isinstance(t, str):
        parts = [int(x) for x in t.split(':')]
        return parts[0] * 60 + parts[1]
    return t.hour * 60 + t.minute

def minutes_to_time(m):
    m = int(m) % 1440
    return time(hour=m // 60, minute=m % 60)

def generate_smart_schedule(user):
    """
    Generates a balanced daily schedule for the user for both Weekdays and Weekends.
    Clears existing schedule items and creates new ones based on PlannerSettings and active Goals.
    """
    # Delete previous schedule items
    ScheduleItem.objects.filter(user=user).delete()

    try:
        settings = user.planner_settings
    except PlannerSettings.DoesNotExist:
        # Create default settings if not exists
        settings = PlannerSettings.objects.create(user=user)

    active_goals = Goal.objects.filter(user=user, is_completed=False).order_by('-priority', 'created_at')

    # Run generator for Weekday (is_weekend=False) and Weekend (is_weekend=True)
    generate_day_schedule(user, settings, active_goals, is_weekend=False)
    generate_day_schedule(user, settings, active_goals, is_weekend=True)

def generate_day_schedule(user, settings, active_goals, is_weekend):
    # Represent the 24-hour day in 48 slots of 30 minutes each
    # Value will be a dictionary with 'type' and 'title'
    day_slots = [None] * 48

    wake_m = time_to_minutes(settings.wake_up_time)
    sleep_m = time_to_minutes(settings.sleep_time)
    
    wake_slot = wake_m // 30
    sleep_slot = sleep_m // 30

    # 1. Fill Sleep slots
    if sleep_slot > wake_slot:
        # Standard sleep (e.g. 00:00 to 06:00 and 22:30 to 24:00)
        # Sleep is from sleep_slot to 48, and 0 to wake_slot
        for s in range(sleep_slot, 48):
            day_slots[s] = {'type': 'SLEEP', 'title': 'Sleep'}
        for s in range(0, wake_slot):
            day_slots[s] = {'type': 'SLEEP', 'title': 'Sleep'}
    else:
        # Sleep doesn't cross midnight (unlikely but possible)
        for s in range(sleep_slot, wake_slot):
            day_slots[s] = {'type': 'SLEEP', 'title': 'Sleep'}

    # 2. Fill Work/College slots (only on weekdays)
    if not is_weekend:
        work_start_m = time_to_minutes(settings.college_office_start)
        work_end_m = time_to_minutes(settings.college_office_end)
        work_start_slot = work_start_m // 30
        work_end_slot = work_end_m // 30

        for s in range(work_start_slot, work_end_slot):
            if day_slots[s] is None:
                day_slots[s] = {'type': 'WORK_COLLEGE', 'title': 'College / Office'}

    # 3. Fill Exercise slot (1 hour right after wake up if free, otherwise later)
    exercise_slots = 2  # 1 hour
    exercise_start = (wake_slot + 1) % 48  # Give 30 mins buffer after waking up
    placed_exercise = False
    for attempt in range(48):
        start = (exercise_start + attempt) % 48
        # Check if 2 slots are free
        slots_to_check = [start, (start + 1) % 48]
        if all(day_slots[s] is None for s in slots_to_check):
            for s in slots_to_check:
                day_slots[s] = {'type': 'EXERCISE', 'title': 'Exercise & Fitness'}
            placed_exercise = True
            break

    # 4. Fill Revision slot (1 hour right before sleep)
    revision_slots = 2
    # Sleep starts at sleep_slot. Revision should end at sleep_slot.
    revision_start = (sleep_slot - revision_slots) % 48
    slots_to_check = [revision_start, (revision_start + 1) % 48]
    if all(day_slots[s] is None for s in slots_to_check):
        for s in slots_to_check:
            day_slots[s] = {'type': 'REVISION', 'title': 'Daily Revision & Review'}

    # 5. Fill Study slots based on active goals
    # Determine target study hours for this day
    target_study_hours = settings.weekend_availability if is_weekend else settings.free_hours
    target_slots = int(target_study_hours * 2)

    # Distribute study hours among active goals
    # If no goals, create generic study blocks
    goals_to_allocate = list(active_goals)
    if not goals_to_allocate:
        # Place a generic study block of target_slots
        allocated_slots = 0
        for s in range(48):
            if day_slots[s] is None and allocated_slots < target_slots:
                day_slots[s] = {'type': 'STUDY', 'title': 'Study & Skill Building'}
                allocated_slots += 1
    else:
        allocated_slots = 0
        goal_idx = 0
        while allocated_slots < target_slots and any(day_slots[s] is None for s in range(48)):
            # Try to place study block for current goal
            current_goal = goals_to_allocate[goal_idx % len(goals_to_allocate)]
            goal_study_slots = max(1, int(current_goal.daily_study_hours * 2))
            
            # Place in chunks of max 2 hours (4 slots) at a time to prevent burnout
            chunk_size = min(4, goal_study_slots, target_slots - allocated_slots)
            
            # Find a contiguous block of free slots
            placed_chunk = False
            for start in range(48):
                slots_to_check = [(start + offset) % 48 for offset in range(chunk_size)]
                # Check if all slots in chunk are free and don't wrap past midnight to make calendar clean
                if all(day_slots[s] is None for s in slots_to_check) and (start + chunk_size <= 48):
                    for s in slots_to_check:
                        day_slots[s] = {'type': 'STUDY', 'title': f'Study: {current_goal.name}'}
                        allocated_slots += 1
                    placed_chunk = True
                    break
            
            if not placed_chunk:
                # If no contiguous chunk, place in any single slot
                for s in range(48):
                    if day_slots[s] is None:
                        day_slots[s] = {'type': 'STUDY', 'title': f'Study: {current_goal.name}'}
                        allocated_slots += 1
                        break
            
            goal_idx += 1
            # Prevent infinite loop if we keep running and no slots are free
            if goal_idx > len(goals_to_allocate) * 5:
                break

    # 6. Fill all remaining slots as Rest / Breakfast / Dinner / Travel
    for s in range(48):
        if day_slots[s] is None:
            # Let's customize the name based on the time
            hour = s // 2
            if 7 <= hour <= 9:
                day_slots[s] = {'type': 'REST', 'title': 'Breakfast & Morning Prep'}
            elif 12 <= hour <= 14:
                day_slots[s] = {'type': 'REST', 'title': 'Lunch & Relax'}
            elif 19 <= hour <= 21:
                day_slots[s] = {'type': 'REST', 'title': 'Dinner & Free Time'}
            else:
                day_slots[s] = {'type': 'REST', 'title': 'Rest & Recharge'}

    # 7. Coalesce adjacent slots of the same type and title to create single ScheduleItems
    # This prevents having forty-eight 30-minute items in the database, making it clean
    s = 0
    while s < 48:
        if day_slots[s] is None:
            s += 1
            continue
        
        current_type = day_slots[s]['type']
        current_title = day_slots[s]['title']
        start_slot = s
        
        # Look ahead to see if next slots match
        while s + 1 < 48 and day_slots[s + 1] and day_slots[s + 1]['type'] == current_type and day_slots[s + 1]['title'] == current_title:
            s += 1
            
        end_slot = s + 1 # exclusive
        
        # Create schedule item
        ScheduleItem.objects.create(
            user=user,
            title=current_title,
            start_time=minutes_to_time(start_slot * 30),
            end_time=minutes_to_time(end_slot * 30),
            type=current_type,
            is_weekend=is_weekend
        )
        s += 1
