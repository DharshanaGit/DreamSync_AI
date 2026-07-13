// DreamSync Habits Controller
// Handles daily habits matrix generation, checkbox logging, creation, and deletion.

document.addEventListener('DOMContentLoaded', () => {
    setupMatrixHeaders();
    loadHabitsMatrix();

    const habitForm = document.getElementById('create-habit-form');
    if (habitForm) {
        habitForm.addEventListener('submit', handleHabitCreation);
    }
});

// Calculate the last 7 days and populate matrix header labels
function getPast7Days() {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push(d);
    }
    return days; // Array of Date objects from oldest to today
}

function setupMatrixHeaders() {
    const headerRow = document.getElementById('matrix-days-header');
    if (!headerRow) return;

    const days = getPast7Days();
    headerRow.innerHTML = '';

    days.forEach(day => {
        const name = day.toLocaleDateString('en-US', { weekday: 'short' });
        const num = day.getDate();
        
        const col = document.createElement('div');
        col.className = 'col text-center';
        col.innerHTML = `
            <div class="fw-bold text-secondary mb-0" style="font-size: 0.8rem;">${name}</div>
            <div class="text-secondary small" style="font-size: 0.75rem;">${num}</div>
        `;
        headerRow.appendChild(col);
    });
}

// Fetch habits and logs, build grid
async function loadHabitsMatrix() {
    const container = document.getElementById('habits-matrix-rows');
    if (!container) return;

    const days = getPast7Days();

    try {
        const res = await apiFetch('/api/habits/');
        if (!res.ok) throw new Error();
        const habits = await res.json();

        if (habits.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5 text-secondary">
                    <p class="mb-2"><i class="bi bi-check-square fs-1"></i></p>
                    <p class="mb-0">No habits tracked. Click Add Custom Habit to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        habits.forEach(habit => {
            const row = document.createElement('div');
            row.className = 'row align-items-center py-3 border-bottom border-color g-2';

            // Get Category Icon
            let icon = 'bi-check-circle';
            let color = 'text-primary';
            switch (habit.category) {
                case 'READING': icon = 'bi-book-half'; color = 'text-primary'; break;
                case 'EXERCISE': icon = 'bi-heart-pulse-fill'; color = 'text-success'; break;
                case 'CODING': icon = 'bi-terminal-fill'; color = 'text-dark dark-text-light'; break;
                case 'WATER': icon = 'bi-droplet-fill'; color = 'text-info'; break;
                case 'SLEEP': icon = 'bi-moon-stars-fill'; color = 'text-secondary'; break;
                case 'MEDITATION': icon = 'bi-emoji-smile-fill'; color = 'text-warning'; break;
            }

            // Left Section: Habit Title & Category
            const titleCol = document.createElement('div');
            titleCol.className = 'col-sm-4 d-flex align-items-center justify-content-between pe-3';
            titleCol.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <i class="bi ${icon} ${color} fs-5"></i>
                    <div>
                        <div class="fw-semibold text-primary" style="font-size: 0.95rem;">${habit.name}</div>
                        <small class="text-secondary" style="font-size: 0.75rem;">${habit.category.toLowerCase()}</small>
                    </div>
                </div>
                <button class="btn btn-sm btn-link text-danger opacity-50 hover-opacity-100 p-0" onclick="deleteHabit(${habit.id})" title="Delete Habit">
                    <i class="bi bi-trash"></i>
                </button>
            `;
            row.appendChild(titleCol);

            // Right Section: 7 Matrix checkboxes
            const matrixCol = document.createElement('div');
            matrixCol.className = 'col-sm-8';
            
            const cellRow = document.createElement('div');
            cellRow.className = 'row text-center';

            days.forEach(day => {
                const dateStr = day.toISOString().split('T')[0];
                const historyData = habit.weekly_history[dateStr] || { completed: false };
                const completed = historyData.completed;

                const cellCol = document.createElement('div');
                cellCol.className = 'col';
                
                // Clicking this toggles log
                const cell = document.createElement('div');
                cell.className = `habit-cell ${completed ? 'completed' : 'failed'}`;
                cell.innerHTML = completed ? '<i class="bi bi-check-lg"></i>' : '<i class="bi bi-plus-circle opacity-25"></i>';
                
                cell.addEventListener('click', () => toggleHabitLog(habit.id, dateStr, !completed, cell));
                
                cellCol.appendChild(cell);
                cellRow.appendChild(cellCol);
            });

            matrixCol.appendChild(cellRow);
            row.appendChild(matrixCol);
            container.appendChild(row);
        });
    } catch (e) {
        container.innerHTML = `<div class="text-danger py-4 text-center">Failed to load habit tracker grid.</div>`;
    }
}

// Log habit completion for a specific date
async function toggleHabitLog(habitId, dateStr, completed, cellEl) {
    try {
        const res = await apiFetch('/api/habits/log/', {
            method: 'POST',
            body: JSON.stringify({
                habit_id: habitId,
                date: dateStr,
                completed: completed
            })
        });

        if (res.ok) {
            // Instantly update cell styles locally for premium responsiveness
            if (completed) {
                cellEl.className = 'habit-cell completed';
                cellEl.innerHTML = '<i class="bi bi-check-lg"></i>';
            } else {
                cellEl.className = 'habit-cell failed';
                cellEl.innerHTML = '<i class="bi bi-plus-circle opacity-25"></i>';
            }
            
            // Reload grid data in background to update reference states
            loadHabitsMatrix();
        }
    } catch (err) {
        console.error('Error logging habit:', err);
    }
}

// Handle Add Custom Habit Submission
async function handleHabitCreation(e) {
    e.preventDefault();

    const name = document.getElementById('habit-name').value;
    const category = document.getElementById('habit-category').value;

    try {
        const res = await apiFetch('/api/habits/', {
            method: 'POST',
            body: JSON.stringify({ name, category })
        });

        if (res.ok) {
            // Dismiss modal
            const modalEl = document.getElementById('addHabitModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            // Reset form
            document.getElementById('create-habit-form').reset();

            // Reload matrix
            loadHabitsMatrix();
        } else {
            alert('Failed to save habit.');
        }
    } catch (err) {
        console.error('Error creating habit:', err);
    }
}

// Delete Habit
async function deleteHabit(habitId) {
    if (!confirm('Are you sure you want to delete this habit? All recorded history for this habit will be permanently deleted.')) return;

    try {
        const res = await apiFetch(`/api/habits/${habitId}/`, {
            method: 'DELETE'
        });

        if (res.ok) {
            loadHabitsMatrix();
        }
    } catch (e) {
        console.error('Error deleting habit:', e);
    }
}
