// DreamSync Progress Page Controller
// Connects API analytics to Chart.js and maps page counter cards.

let habitsChartInstance = null;
let tasksChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    loadProgressAnalytics();

    // Redraw charts on theme toggle to match grid and text colors
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            // Give body class time to toggle
            setTimeout(loadChartsDataOnly, 100);
        });
    }
});

// Primary analytics loader
async function loadProgressAnalytics() {
    try {
        const res = await apiFetch('/api/analytics/');
        if (!res.ok) throw new Error();
        const data = await res.json();

        // 1. Populate Metric Cards
        document.getElementById('streak-counter').textContent = `${data.streak} Days`;
        document.getElementById('weekly-hours-counter').textContent = `${data.study_hours.total_weekly} hrs`;
        document.getElementById('tasks-completed-counter').textContent = `${data.tasks.completed} / ${data.tasks.total}`;
        document.getElementById('goals-completed-counter').textContent = `${data.goals.completed} / ${data.goals.total}`;

        // 2. Populate Study Hours progress bars
        document.getElementById('weekday-allocation-text').textContent = `${data.study_hours.weekday} hrs/day`;
        document.getElementById('weekend-allocation-text').textContent = `${data.study_hours.weekend} hrs/day`;
        
        // Compute percentage of 8 hours max reference
        const weekdayPct = Math.min(100, (data.study_hours.weekday / 8) * 100);
        const weekendPct = Math.min(100, (data.study_hours.weekend / 8) * 100);

        const weekdayBar = document.getElementById('weekday-progress-bar');
        const weekendBar = document.getElementById('weekend-progress-bar');
        
        if (weekdayBar) {
            weekdayBar.style.width = `${weekdayPct}%`;
            weekdayBar.className = `progress-bar rounded-pill ${weekdayPct > 60 ? 'bg-primary' : 'bg-info'}`;
        }
        if (weekendBar) {
            weekendBar.style.width = `${weekendPct}%`;
        }

        // 3. Render Chart.js graphs
        renderCharts(data.charts);
    } catch (e) {
        console.error('Error loading progress analytics data:', e);
    }
}

// Redraw chart styling only when theme changes (avoids fetching API again)
async function loadChartsDataOnly() {
    try {
        const res = await apiFetch('/api/analytics/');
        if (res.ok) {
            const data = await res.json();
            renderCharts(data.charts);
        }
    } catch (e) {
        console.error('Error redrawing charts:', e);
    }
}

// Draw/Update charts with standard or dark configuration parameters
function renderCharts(chartData) {
    const isDark = document.body.classList.contains('dark-theme');
    
    // Theme-dependent colors
    const gridColor = isDark ? '#1e293b' : '#e2e8f0';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const primaryColor = isDark ? '#6366f1' : '#4f46e5'; // indigo
    const secondaryColor = '#10b981'; // green

    // Helper chart options generator
    const getOptions = (maxTicksY) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            x: {
                grid: {
                    color: gridColor
                },
                ticks: {
                    color: textColor,
                    font: {
                        family: 'Inter',
                        size: 11
                    }
                }
            },
            y: {
                grid: {
                    color: gridColor
                },
                ticks: {
                    color: textColor,
                    font: {
                        family: 'Inter',
                        size: 11
                    },
                    stepSize: 1
                },
                suggestedMax: maxTicksY
            }
        }
    });

    // 1. Habit Consistency Chart (Line Chart)
    const habitsCtx = document.getElementById('habitsChart');
    if (habitsCtx) {
        if (habitsChartInstance) {
            habitsChartInstance.destroy();
        }

        // Format dates into readable formats (e.g. "Jul 13")
        const formattedLabels = chartData.labels.map(l => {
            const parts = l.split('-');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const month = monthNames[parseInt(parts[1]) - 1];
            return `${month} ${parts[2]}`;
        });

        habitsChartInstance = new Chart(habitsCtx, {
            type: 'line',
            data: {
                labels: formattedLabels,
                datasets: [{
                    label: 'Habits Completed (%)',
                    data: chartData.habit_completion,
                    borderColor: primaryColor,
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.08)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointBackgroundColor: primaryColor
                }]
            },
            options: getOptions(100)
        });
    }

    // 2. Tasks Completed Chart (Bar Chart)
    const tasksCtx = document.getElementById('tasksChart');
    if (tasksCtx) {
        if (tasksChartInstance) {
            tasksChartInstance.destroy();
        }

        const formattedLabels = chartData.labels.map(l => {
            const parts = l.split('-');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const month = monthNames[parseInt(parts[1]) - 1];
            return `${month} ${parts[2]}`;
        });

        // Determine max ticks for tasks
        const maxTasks = Math.max(...chartData.tasks_completed, 3);

        tasksChartInstance = new Chart(tasksCtx, {
            type: 'bar',
            data: {
                labels: formattedLabels,
                datasets: [{
                    label: 'Tasks Completed',
                    data: chartData.tasks_completed,
                    backgroundColor: secondaryColor,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: getOptions(maxTasks + 1)
        });
    }
}
