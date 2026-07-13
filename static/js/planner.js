// DreamSync Planner Controller
// Controls user schedules, settings form submission, and timeline displays.

document.addEventListener('DOMContentLoaded', () => {
    loadPlannerSettings();
    loadScheduleTimelines();

    const settingsForm = document.getElementById('planner-settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', savePlannerSettings);
    }
});

// Fetch settings from API and pre-fill form
async function loadPlannerSettings() {
    try {
        const res = await apiFetch('/api/planner/settings/');
        if (!res.ok) throw new Error();
        const settings = await res.json();

        // Slice times from "06:00:00" to "06:00" for standard HTML time input compatibility
        document.getElementById('wake-up').value = settings.wake_up_time.slice(0, 5);
        document.getElementById('sleep-time').value = settings.sleep_time.slice(0, 5);
        document.getElementById('college-start').value = settings.college_office_start.slice(0, 5);
        document.getElementById('college-end').value = settings.college_office_end.slice(0, 5);
        document.getElementById('free-hours').value = settings.free_hours;
        document.getElementById('weekend-hours').value = settings.weekend_availability;
    } catch (e) {
        console.error('Error fetching planner settings:', e);
    }
}

// Fetch and render weekday/weekend timelines
async function loadScheduleTimelines() {
    const weekdayEl = document.getElementById('weekday-timeline');
    const weekendEl = document.getElementById('weekend-timeline');

    if (!weekdayEl || !weekendEl) return;

    try {
        const res = await apiFetch('/api/planner/schedule/');
        if (!res.ok) throw new Error();
        const items = await res.json();

        const weekdayItems = items.filter(item => !item.is_weekend);
        const weekendItems = items.filter(item => item.is_weekend);

        // Helper render timeline function
        const renderTimeline = (container, list) => {
            if (list.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-4 text-secondary">
                        <i class="bi bi-calendar-x fs-3 d-block mb-2"></i>
                        No schedule available. Re-run timings setup.
                    </div>
                `;
                return;
            }

            container.innerHTML = '';
            list.forEach(item => {
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

                // Format time "17:30:00" to "5:30 PM"
                const formatTime = (timeStr) => {
                    const parts = timeStr.split(':');
                    const hour = parseInt(parts[0]);
                    const min = parts[1];
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    const formattedHour = hour % 12 || 12;
                    return `${formattedHour}:${min} ${ampm}`;
                };

                const start = formatTime(item.start_time);
                const end = formatTime(item.end_time);

                const timelineItem = document.createElement('div');
                timelineItem.className = 'timeline-item';
                timelineItem.innerHTML = `
                    <div class="timeline-dot"></div>
                    <div class="timeline-time">${start} - ${end}</div>
                    <div class="card-dreamsync p-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="fw-bold mb-0">${item.title}</h6>
                            <span class="badge ${badgeClass} rounded-pill d-flex align-items-center gap-1" style="font-size: 0.75rem;">
                                <i class="bi ${icon}"></i> ${item.type.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                `;
                container.appendChild(timelineItem);
            });
        };

        renderTimeline(weekdayEl, weekdayItems);
        renderTimeline(weekendEl, weekendItems);
    } catch (e) {
        weekdayEl.innerHTML = `<div class="text-danger py-3 text-center">Failed to fetch schedules.</div>`;
        weekendEl.innerHTML = `<div class="text-danger py-3 text-center">Failed to fetch schedules.</div>`;
    }
}

// Save Timings Settings
async function savePlannerSettings(e) {
    e.preventDefault();

    const saveBtn = document.getElementById('save-settings-btn');
    const oldHtml = saveBtn.innerHTML;

    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> Saving...`;

    const bodyData = {
        wake_up_time: document.getElementById('wake-up').value + ":00",
        sleep_time: document.getElementById('sleep-time').value + ":00",
        college_office_start: document.getElementById('college-start').value + ":00",
        college_office_end: document.getElementById('college-end').value + ":00",
        free_hours: parseInt(document.getElementById('free-hours').value),
        weekend_availability: parseInt(document.getElementById('weekend-hours').value)
    };

    try {
        const res = await apiFetch('/api/planner/settings/', {
            method: 'PUT',
            body: JSON.stringify(bodyData)
        });

        if (res.ok) {
            // Re-fetch schedules (they are regenerated in the backend views perform_update)
            await loadScheduleTimelines();
        } else {
            alert('Failed to update settings. Please check parameters.');
        }
    } catch (err) {
        console.error('Error saving settings:', err);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = oldHtml;
    }
}
