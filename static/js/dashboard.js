// DreamSync Dashboard Controller
// Manages and dynamically updates Today's Schedule, Tasks, Progress, and Settings.

const QUOTES = [
    { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
    { text: "Continuous improvement is better than delayed perfection.", author: "Mark Twain" },
    { text: "Work like there is someone working twenty-four hours a day to take it all away from you.", author: "Mark Cuban" }
];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Page Loading Setup
    displayQuote();
    setupDateStrings();
    loadDashboardData();

    // 2. Event Listeners for controls
    const taskForm = document.getElementById('create-task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskCreation);
    }

    const regenBtn = document.getElementById('regenerate-schedule-btn');
    if (regenBtn) {
        regenBtn.addEventListener('click', handleScheduleRegeneration);
    }

    // Modal Goal populator when modal is shown
    const addTaskModal = document.getElementById('addTaskModal');
    if (addTaskModal) {
        addTaskModal.addEventListener('show.bs.modal', populateGoalDropdown);
    }
});

// Setup dates and check if weekend
function setupDateStrings() {
    const today = new Date();
    
    // Formatting date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = today.toLocaleDateString('en-US', options);
    
    const dateEl = document.getElementById('today-date-string');
    if (dateEl) {
        dateEl.textContent = dateStr;
    }

    // Check if weekend (Saturday or Sunday)
    const day = today.getDay();
    const isWeekend = (day === 6 || day === 0);
    const dayTypeEl = document.getElementById('schedule-day-type');
    if (dayTypeEl) {
        dayTypeEl.textContent = isWeekend ? "Weekend Mode" : "Weekday Mode";
        dayTypeEl.className = isWeekend ? "badge bg-secondary text-white" : "badge bg-primary text-white";
    }

    // Populate calendar row for the current week (7 days)
    const calendarRow = document.getElementById('week-calendar-row');
    if (calendarRow) {
        calendarRow.innerHTML = '';
        
        // Find start of week (Monday)
        const startOfWeek = new Date(today);
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
        startOfWeek.setDate(diff);

        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(startOfWeek);
            currentDay.setDate(startOfWeek.getDate() + i);

            const isToday = currentDay.toDateString() === today.toDateString();
            const dayNum = currentDay.getDate();
            const dayName = currentDay.toLocaleDateString('en-US', { weekday: 'short' });

            const col = document.createElement('div');
            col.className = 'col';
            col.innerHTML = `
                <div class="p-2 rounded ${isToday ? 'bg-primary text-white' : 'bg-light-theme-alt border-0'}" 
                     style="background-color: ${isToday ? 'var(--primary)' : 'var(--bg-primary)'}; border: 1px solid var(--border-color);">
                    <div class="small fw-semibold ${isToday ? 'text-white' : 'text-secondary'}">${dayName}</div>
                    <div class="fs-5 fw-bold">${dayNum}</div>
                </div>
            `;
            calendarRow.appendChild(col);
        }
    }

    // Auto set due date in create task modal to today by default
    const taskDateInput = document.getElementById('task-date');
    if (taskDateInput) {
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        taskDateInput.value = `${yyyy}-${mm}-${dd}`;
    }
}

// Display randomized motivational quote
function displayQuote() {
    const quoteEl = document.getElementById('motivational-quote');
    const authorEl = document.getElementById('motivational-author');
    
    if (quoteEl && authorEl) {
        const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        quoteEl.textContent = `"${randomQuote.text}"`;
        authorEl.textContent = `- ${randomQuote.author}`;
    }
}

// Fetch all dashboard elements: Goals, Schedule, Tasks, and Analytics
async function loadDashboardData() {
    try {
        await Promise.all([
            loadTodaySchedule(),
            loadTasks(),
            loadAnalytics(),
            loadPrimaryGoal()
        ]);
    } catch (e) {
        console.error('Error loading dashboard data:', e);
    }
}

// Load Today's Schedule Timeline
async function loadTodaySchedule() {
    const timelineEl = document.getElementById('schedule-timeline');
    if (!timelineEl) return;

    try {
        const res = await apiFetch('/api/planner/schedule/');
        if (!res.ok) throw new Error('Failed to load schedule');
        const items = await res.json();

        // Check current day mode (weekend vs weekday)
        const today = new Date();
        const isWeekend = (today.getDay() === 6 || today.getDay() === 0);
        
        // Filter items that match the weekend status
        const filteredItems = items.filter(item => item.is_weekend === isWeekend);

        if (filteredItems.length === 0) {
            timelineEl.innerHTML = `
                <div class="text-center py-4 text-secondary">
                    <p class="mb-2"><i class="bi bi-calendar-x fs-2"></i></p>
                    <p class="mb-0">No schedule generated yet. Hit regenerate to get started.</p>
                </div>
            `;
            return;
        }

        timelineEl.innerHTML = '';
        filteredItems.forEach(item => {
            // Get badge color based on schedule type
            let badgeClass = 'bg-primary-light text-primary';
            let icon = 'bi-activity';
            
            switch (item.type) {
                case 'SLEEP':
                    badgeClass = 'bg-secondary-light text-secondary';
                    icon = 'bi-moon';
                    break;
                case 'WORK_COLLEGE':
                    badgeClass = 'bg-warning text-dark opacity-75';
                    icon = 'bi-building';
                    break;
                case 'EXERCISE':
                    badgeClass = 'bg-success text-white opacity-75';
                    icon = 'bi-heart-pulse';
                    break;
                case 'STUDY':
                    badgeClass = 'bg-primary text-white';
                    icon = 'bi-book';
                    break;
                case 'REVISION':
                    badgeClass = 'bg-info text-dark';
                    icon = 'bi-arrow-clockwise';
                    break;
                case 'REST':
                    badgeClass = 'bg-secondary text-white opacity-75';
                    icon = 'bi-cup-hot';
                    break;
            }

            // Convert "17:30:00" to "5:30 PM"
            const formatTime = (timeStr) => {
                const parts = timeStr.split(':');
                const hour = parseInt(parts[0]);
                const min = parts[1];
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const formattedHour = hour % 12 || 12;
                return `${formattedHour}:${min} ${ampm}`;
            };

            const formattedStart = formatTime(item.start_time);
            const formattedEnd = formatTime(item.end_time);

            const timelineItem = document.createElement('div');
            timelineItem.className = 'timeline-item';
            timelineItem.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-time">${formattedStart} - ${formattedEnd}</div>
                <div class="card-dreamsync p-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="fw-bold mb-0">${item.title}</h6>
                        <span class="badge ${badgeClass} rounded-pill d-flex align-items-center gap-1" style="font-size: 0.75rem;">
                            <i class="bi ${icon}"></i> ${item.type.replace('_', ' ')}
                        </span>
                    </div>
                </div>
            `;
            timelineEl.appendChild(timelineItem);
        });
    } catch (e) {
        timelineEl.innerHTML = `<div class="text-danger text-center py-3">Error fetching schedule.</div>`;
    }
}

// Load tasks list
async function loadTasks() {
    const listEl = document.getElementById('tasks-list');
    if (!listEl) return;

    try {
        const res = await apiFetch('/api/tasks/');
        if (!res.ok) throw new Error();
        const tasks = await res.json();
        
        // Filter to show pending and in_progress tasks, or completed today
        const todayStr = new Date().toISOString().split('T')[0];
        const activeTasks = tasks.filter(t => t.status !== 'COMPLETED' || t.due_date === todayStr);

        if (activeTasks.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-4 text-secondary">
                    <p class="mb-1"><i class="bi bi-patch-check fs-2 text-success"></i></p>
                    <p class="mb-0">All tasks completed for today!</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = '';
        activeTasks.forEach(task => {
            const isCompleted = task.status === 'COMPLETED';
            
            // Priority badge class
            let priorityBadge = '';
            if (task.priority === 'HIGH') priorityBadge = '<span class="badge badge-priority-high">High</span>';
            else if (task.priority === 'MEDIUM') priorityBadge = '<span class="badge badge-priority-medium">Medium</span>';
            else priorityBadge = '<span class="badge badge-priority-low">Low</span>';

            const item = document.createElement('div');
            item.className = 'list-group-item d-flex align-items-center justify-content-between border-0 px-0 py-3 bg-transparent';
            item.style.borderBottom = '1px solid var(--border-color) !important';
            item.innerHTML = `
                <div class="d-flex align-items-center gap-3">
                    <input class="form-check-input border-secondary-subtle" type="checkbox" style="width: 1.25rem; height: 1.25rem; cursor:pointer;" 
                           ${isCompleted ? 'checked' : ''} onchange="toggleTaskStatus(${task.id}, this.checked)">
                    <div>
                        <div class="fw-semibold ${isCompleted ? 'text-decoration-line-through text-secondary' : ''}">${task.title}</div>
                        <div class="small text-secondary d-flex align-items-center gap-2 mt-1">
                            <span><i class="bi bi-calendar"></i> ${task.due_date}</span>
                            ${task.goal_name ? `<span>• <i class="bi bi-trophy"></i> ${task.goal_name}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div>
                    ${priorityBadge}
                </div>
            `;
            listEl.appendChild(item);
        });
    } catch (e) {
        listEl.innerHTML = `<div class="text-danger py-3 text-center">Error fetching tasks.</div>`;
    }
}

// Check/Uncheck task handler
async function toggleTaskStatus(taskId, isChecked) {
    const newStatus = isChecked ? 'COMPLETED' : 'PENDING';
    
    try {
        const res = await apiFetch(`/api/tasks/${taskId}/`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        
        if (res.ok) {
            // Reload tasks list & progress circle
            loadTasks();
            loadAnalytics();
        }
    } catch (e) {
        console.error('Error toggling task:', e);
    }
}

// Load Progress circle calculations
async function loadAnalytics() {
    try {
        const res = await apiFetch('/api/analytics/');
        if (!res.ok) return;
        const data = await res.json();

        // 1. Calculate overall progress percentage
        // Mix task completion and habit logs completion for today's value, or just use task completion rate
        const taskRate = data.tasks.completion_rate;
        
        // Let's check habit completion for today if exists
        const habitRate = data.charts.habit_completion[data.charts.habit_completion.length - 1] || 0;
        
        // We will average them or use tasks rate if no habits logged
        let overallPercent = taskRate;
        if (data.charts.habit_completion.length > 0) {
            overallPercent = Math.round((taskRate + habitRate) / 2);
        }

        // 2. Animate Circular Progress SVG
        const circle = document.getElementById('progress-circle');
        const textPercent = document.getElementById('progress-percent-text');
        
        if (circle && textPercent) {
            const circumference = 2 * Math.PI * 58; // r=58 -> 364.42
            circle.style.strokeDasharray = `${circumference} ${circumference}`;
            
            const offset = circumference - (overallPercent / 100) * circumference;
            circle.style.strokeDashoffset = offset;
            
            textPercent.textContent = `${overallPercent}%`;
        }

        // Welcome Username
        const welcomeUserEl = document.getElementById('welcome-username');
        if (welcomeUserEl) {
            // We'll query details, or use the displayName already fetched in auth.js
            const displayName = document.getElementById('user-display-name').textContent;
            if (displayName && displayName !== 'User') {
                welcomeUserEl.textContent = displayName;
            }
        }
    } catch (e) {
        console.error('Error loading analytics:', e);
    }
}

// Load Primary Goal Widget details
async function loadPrimaryGoal() {
    const widgetContent = document.getElementById('goal-widget-content');
    if (!widgetContent) return;

    try {
        const res = await apiFetch('/api/goals/');
        if (!res.ok) return;
        const goals = await res.json();
        
        const activeGoals = goals.filter(g => !g.is_completed);

        if (activeGoals.length === 0) {
            widgetContent.innerHTML = `
                <div class="text-center py-2 text-secondary">
                    <p class="mb-1"><i class="bi bi-trophy"></i></p>
                    <p class="mb-0 small">No active goals. Set a goal in Goals tab!</p>
                </div>
            `;
            return;
        }

        // Primary goal is the highest priority active goal
        const primaryGoal = activeGoals[0];
        
        // Calculate days remaining
        const today = new Date();
        const target = new Date(primaryGoal.target_date);
        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let daysLeftStr = '';
        if (diffDays < 0) daysLeftStr = 'Ended';
        else if (diffDays === 0) daysLeftStr = 'Due today';
        else daysLeftStr = `${diffDays} days left`;

        widgetContent.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="fw-bold mb-0">${primaryGoal.name}</h6>
                <span class="badge ${primaryGoal.priority === 'HIGH' ? 'badge-priority-high' : 'badge-priority-medium'}">${primaryGoal.priority}</span>
            </div>
            <div class="d-flex align-items-center gap-2 mb-3">
                <span class="small text-secondary"><i class="bi bi-calendar-event"></i> Target: ${primaryGoal.target_date}</span>
                <span class="small text-primary fw-semibold">• ${daysLeftStr}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center small">
                <span class="text-secondary">Allocated Study:</span>
                <span class="fw-bold text-primary">${primaryGoal.daily_study_hours} hrs / day</span>
            </div>
        `;
    } catch (e) {
        widgetContent.innerHTML = `<div class="text-danger small">Error fetching goal info.</div>`;
    }
}

// Populate Goal Dropdown in Task Modal
async function populateGoalDropdown() {
    const dropdown = document.getElementById('task-goal');
    if (!dropdown) return;

    try {
        const res = await apiFetch('/api/goals/');
        if (!res.ok) return;
        const goals = await res.json();
        
        const activeGoals = goals.filter(g => !g.is_completed);

        dropdown.innerHTML = '<option value="">No goal (Independent task)</option>';
        activeGoals.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.name;
            dropdown.appendChild(opt);
        });
    } catch (e) {
        console.error('Error populating goals dropdown:', e);
    }
}

// Handle Add Task Submission
async function handleTaskCreation(e) {
    e.preventDefault();

    const title = document.getElementById('task-title').value;
    const goalId = document.getElementById('task-goal').value;
    const dueDate = document.getElementById('task-date').value;
    const priority = document.getElementById('task-priority').value;

    const bodyData = {
        title,
        due_date: dueDate,
        priority,
        status: 'PENDING'
    };

    if (goalId) {
        bodyData.goal = parseInt(goalId);
    }

    try {
        const res = await apiFetch('/api/tasks/', {
            method: 'POST',
            body: JSON.stringify(bodyData)
        });

        if (res.ok) {
            // Dismiss modal
            const modalEl = document.getElementById('addTaskModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            // Reset form
            document.getElementById('create-task-form').reset();
            setupDateStrings(); // resets dates

            // Reload data
            loadTasks();
            loadAnalytics();
        } else {
            alert('Failed to create task. Please check details.');
        }
    } catch (err) {
        console.error('Error creating task:', err);
    }
}

// Trigger Smart Schedule Regeneration
async function handleScheduleRegeneration() {
    const timelineEl = document.getElementById('schedule-timeline');
    const regenBtn = document.getElementById('regenerate-schedule-btn');

    if (regenBtn) {
        regenBtn.disabled = true;
        regenBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> Generating...`;
    }

    try {
        const res = await apiFetch('/api/planner/schedule/regenerate/', {
            method: 'POST'
        });

        if (res.ok) {
            await loadTodaySchedule();
        } else {
            alert('Could not generate schedule. Please add active goals first.');
        }
    } catch (e) {
        console.error('Error regenerating schedule:', e);
    } finally {
        if (regenBtn) {
            regenBtn.disabled = false;
            regenBtn.innerHTML = `<i class="bi bi-arrow-repeat"></i> Regenerate`;
        }
    }
}
