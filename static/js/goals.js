// DreamSync Goals Controller
// Handles Goals listing, creation, status editing, and removal.

document.addEventListener('DOMContentLoaded', () => {
    loadGoals();

    const goalForm = document.getElementById('create-goal-form');
    if (goalForm) {
        goalForm.addEventListener('submit', handleGoalCreation);
    }

    // Set today's date as min for target date
    const dateInput = document.getElementById('goal-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        dateInput.min = today;
    }
});

// Fetch all goals and render lists
async function loadGoals() {
    const activeGrid = document.getElementById('active-goals-grid');
    const completedGrid = document.getElementById('completed-goals-grid');

    if (!activeGrid || !completedGrid) return;

    try {
        const res = await apiFetch('/api/goals/');
        if (!res.ok) throw new Error();
        const goals = await res.json();

        const activeGoals = goals.filter(g => !g.is_completed);
        const completedGoals = goals.filter(g => g.is_completed);

        // 1. Render Active Goals
        if (activeGoals.length === 0) {
            activeGrid.innerHTML = `
                <div class="col-12 text-center py-5 text-secondary">
                    <p class="mb-2"><i class="bi bi-trophy fs-1"></i></p>
                    <p class="mb-0">You don't have any active goals. Click Add New Goal to begin.</p>
                </div>
            `;
        } else {
            activeGrid.innerHTML = '';
            activeGoals.forEach(goal => {
                // Calculate days left
                const today = new Date();
                const target = new Date(goal.target_date);
                const diffTime = target - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let daysLeftText = '';
                if (diffDays < 0) daysLeftText = 'Overdue';
                else if (diffDays === 0) daysLeftText = 'Due Today';
                else daysLeftText = `${diffDays} days remaining`;

                // Badge styling
                let badgeClass = 'badge-priority-medium';
                if (goal.priority === 'HIGH') badgeClass = 'badge-priority-high';
                else if (goal.priority === 'LOW') badgeClass = 'badge-priority-low';

                const cardCol = document.createElement('div');
                cardCol.className = 'col-md-6 col-lg-4';
                cardCol.innerHTML = `
                    <div class="card-dreamsync h-100 d-flex flex-column justify-content-between">
                        <div>
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <h5 class="fw-bold mb-0 text-truncate" style="max-width: 70%;" title="${goal.name}">${goal.name}</h5>
                                <span class="badge ${badgeClass}">${goal.priority}</span>
                            </div>
                            
                            <div class="mb-3 small text-secondary">
                                <div class="mb-1"><i class="bi bi-calendar-event me-2"></i>Target: ${goal.target_date}</div>
                                <div><i class="bi bi-clock me-2"></i>Study Alloc: ${goal.daily_study_hours} hrs/day</div>
                            </div>
                        </div>

                        <div>
                            <div class="fw-semibold text-primary mb-3 small">${daysLeftText}</div>
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-success flex-grow-1" onclick="completeGoal(${goal.id})">
                                    <i class="bi bi-check-circle"></i> Complete
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteGoal(${goal.id})" title="Delete Goal">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                activeGrid.appendChild(cardCol);
            });
        }

        // 2. Render Completed Goals
        if (completedGoals.length === 0) {
            completedGrid.innerHTML = `
                <div class="text-center py-3 text-secondary small">No completed goals in archive yet.</div>
            `;
        } else {
            completedGrid.innerHTML = '';
            completedGoals.forEach(goal => {
                const cardCol = document.createElement('div');
                cardCol.className = 'col-md-6 col-lg-4';
                cardCol.innerHTML = `
                    <div class="card-dreamsync opacity-75 h-100 d-flex flex-column justify-content-between" style="background-color: var(--bg-primary);">
                        <div>
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="fw-bold mb-0 text-decoration-line-through text-secondary text-truncate" style="max-width: 80%;">${goal.name}</h6>
                                <span class="badge bg-secondary text-white rounded-pill">Completed</span>
                            </div>
                            <small class="text-secondary d-block mb-3">Completed target goal on ${goal.target_date}</small>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary flex-grow-1" onclick="uncompleteGoal(${goal.id})">
                                <i class="bi bi-arrow-counterclockwise"></i> Reactivate
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteGoal(${goal.id})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                completedGrid.appendChild(cardCol);
            });
        }
    } catch (e) {
        activeGrid.innerHTML = `<div class="text-danger py-4 text-center col-12">Failed to load goals.</div>`;
    }
}

// Handle Goal Creation Form Submit
async function handleGoalCreation(e) {
    e.preventDefault();

    const name = document.getElementById('goal-name').value;
    const targetDate = document.getElementById('goal-date').value;
    const priority = document.getElementById('goal-priority').value;
    const studyHours = parseFloat(document.getElementById('goal-hours').value);

    try {
        const res = await apiFetch('/api/goals/', {
            method: 'POST',
            body: JSON.stringify({
                name,
                target_date: targetDate,
                priority,
                daily_study_hours: studyHours
            })
        });

        if (res.ok) {
            // Dismiss modal
            const modalEl = document.getElementById('addGoalModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            // Reset form
            document.getElementById('create-goal-form').reset();

            // Regenerate schedule to integrate the new study hours
            await apiFetch('/api/planner/schedule/regenerate/', { method: 'POST' });

            // Reload goals list
            loadGoals();
        } else {
            alert('Could not save goal. Please check values.');
        }
    } catch (err) {
        console.error('Error creating goal:', err);
    }
}

// Mark Goal as Complete
async function completeGoal(goalId) {
    try {
        const res = await apiFetch(`/api/goals/${goalId}/`, {
            method: 'PATCH',
            body: JSON.stringify({ is_completed: true })
        });

        if (res.ok) {
            // Regenerate schedule to free up study slots
            await apiFetch('/api/planner/schedule/regenerate/', { method: 'POST' });
            loadGoals();
        }
    } catch (err) {
        console.error('Error completing goal:', err);
    }
}

// Reactivate completed Goal
async function uncompleteGoal(goalId) {
    try {
        const res = await apiFetch(`/api/goals/${goalId}/`, {
            method: 'PATCH',
            body: JSON.stringify({ is_completed: false })
        });

        if (res.ok) {
            // Regenerate schedule to allocate study slots again
            await apiFetch('/api/planner/schedule/regenerate/', { method: 'POST' });
            loadGoals();
        }
    } catch (err) {
        console.error('Error reactivating goal:', err);
    }
}

// Delete Goal
async function deleteGoal(goalId) {
    if (!confirm('Are you sure you want to delete this goal? All related tasks will lose their connection, and your schedule will regenerate.')) return;

    try {
        const res = await apiFetch(`/api/goals/${goalId}/`, {
            method: 'DELETE'
        });

        if (res.ok) {
            // Schedule regeneration is handled by the backend destroy method automatically!
            loadGoals();
        }
    } catch (e) {
        console.error('Error deleting goal:', e);
    }
}
