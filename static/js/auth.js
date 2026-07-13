// DreamSync Authentication & Global Utilities
// Manages JWT tokens, automatic refresh, route guards, dark-theme settings, and sidebar operations.

const AUTH_ACCESS_KEY = 'dreamsync_access_token';
const AUTH_REFRESH_KEY = 'dreamsync_refresh_token';

// 1. JWT Storage Utilities
function getAccessToken() {
    return localStorage.getItem(AUTH_ACCESS_KEY);
}

function getRefreshToken() {
    return localStorage.getItem(AUTH_REFRESH_KEY);
}

function setTokens(access, refresh) {
    localStorage.setItem(AUTH_ACCESS_KEY, access);
    localStorage.setItem(AUTH_REFRESH_KEY, refresh);
}

function clearTokens() {
    localStorage.removeItem(AUTH_ACCESS_KEY);
    localStorage.removeItem(AUTH_REFRESH_KEY);
}

// 2. Global API Fetch Wrapper with Automatic JWT Refresh
async function apiFetch(url, options = {}) {
    options.headers = options.headers || {};
    
    // Add Authorization header if token exists
    const token = getAccessToken();
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Ensure content type is JSON by default for requests with body
    if (options.body && !(options.body instanceof FormData) && !options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
    }

    try {
        let response = await fetch(url, options);

        // If unauthorized (401), try to refresh the access token
        if (response.status === 401 && getRefreshToken()) {
            console.log('Access token expired, attempting refresh...');
            const refreshSuccess = await refreshAccessToken();
            
            if (refreshSuccess) {
                // Retry the original request with the new access token
                options.headers['Authorization'] = `Bearer ${getAccessToken()}`;
                response = await fetch(url, options);
            } else {
                // Refresh token also invalid/expired -> Log out user
                console.warn('Refresh token invalid. Redirecting to login.');
                clearTokens();
                if (window.location.pathname !== '/login/' && window.location.pathname !== '/') {
                    window.location.href = '/login/';
                }
            }
        }
        return response;
    } catch (err) {
        console.error('API Fetch error:', err);
        throw err;
    }
}

// Helper to refresh access token
async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
        const response = await fetch('/api/auth/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refresh: refreshToken })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem(AUTH_ACCESS_KEY, data.access);
            console.log('Successfully refreshed access token.');
            return true;
        }
    } catch (err) {
        console.error('Failed to refresh token:', err);
    }
    return false;
}

// 3. Route Guard Validation
function runRouteGuards() {
    const path = window.location.pathname;
    const token = getAccessToken();
    
    const publicPaths = ['/', '/login/'];
    const isPublicPath = publicPaths.includes(path);

    if (!token && !isPublicPath) {
        // Not logged in and trying to access private dashboard pages
        window.location.href = '/login/';
    } else if (token && path === '/login/') {
        // Logged in and trying to access login page
        window.location.href = '/dashboard/';
    }
}

// 4. Load User info to sidebar
async function loadSidebarUserInfo() {
    if (!getAccessToken()) return;
    
    const displayNameEl = document.getElementById('user-display-name');
    if (!displayNameEl) return;

    try {
        const res = await apiFetch('/api/auth/user/');
        if (res.ok) {
            const user = await res.json();
            displayNameEl.textContent = user.username;
        }
    } catch (e) {
        console.error('Error loading sidebar user info:', e);
    }
}

// 5. Initialize Theme and Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Run auth guards immediately
    runRouteGuards();

    // Setup active state on sidebar navigation links
    const currentPath = window.location.pathname;
    const links = {
        '/dashboard/': 'nav-dashboard',
        '/goals/': 'nav-goals',
        '/planner/': 'nav-planner',
        '/habits/': 'nav-habits',
        '/progress/': 'nav-progress'
    };
    
    const activeLinkId = links[currentPath];
    if (activeLinkId) {
        const activeLink = document.getElementById(activeLinkId);
        if (activeLink) activeLink.classList.add('active');
    }

    // Load user display name in sidebar
    loadSidebarUserInfo();

    // Dark Mode Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    // Update icon helper
    function updateThemeIcon(theme) {
        if (!themeIcon) return;
        if (theme === 'dark') {
            themeIcon.className = 'bi bi-moon-stars-fill';
        } else {
            themeIcon.className = 'bi bi-sun-fill';
        }
    }

    // Set initial icon state
    const currentTheme = localStorage.getItem('theme') || 'light';
    updateThemeIcon(currentTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-theme');
            const newTheme = isDark ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    // Mobile Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
        
        // Close sidebar if user clicks outside of it on mobile
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }

    // Logout Action
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            clearTokens();
            window.location.href = '/';
        });
    }
});
