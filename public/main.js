/**
 * Frontend logic for Forex Academy App
 */

// Utility: Show alert message
function showAlert(elementId, message, isError = true) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = isError ? 'alert error' : 'alert success';
    // Remove after 5 seconds
    setTimeout(() => {
        el.className = 'alert hidden';
    }, 5000);
}

// ----------------------------------------------------
// AUTHENTICATION LOGIC (index.html)
// ----------------------------------------------------
function initAuthPage() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    // Toggle Views
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', () => {
            loginView.classList.add('hidden');
            registerView.classList.remove('hidden');
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', () => {
            registerView.classList.add('hidden');
            loginView.classList.remove('hidden');
        });
    }

    // Login Submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            
            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                
                if (!res.ok) {
                    showAlert('auth-alert', data.error || 'Login failed', true);
                } else {
                    // Success -> Go to App
                    window.location.href = 'app.html';
                }
            } catch (err) {
                showAlert('auth-alert', 'Network error. Please try again.', true);
            }
        });
    }

    // Register Submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('reg-username').value;
            const password = document.getElementById('reg-password').value;
            
            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                
                if (!res.ok) {
                    showAlert('auth-alert', data.error || 'Registration failed', true);
                } else {
                    // Success -> Go to App (Auto-logged in)
                    window.location.href = 'app.html';
                }
            } catch (err) {
                showAlert('auth-alert', 'Network error. Please try again.', true);
            }
        });
    }
}

// Check if logged in already -> redirect from index to app
async function checkRedirectIfLoggedIn() {
    try {
        const res = await fetch('/api/me');
        if (res.ok) {
            window.location.href = 'app.html';
        }
    } catch (e) {
        // network error, do nothing
    }
}

// ----------------------------------------------------
// DASHBOARD LOGIC (app.html)
// ----------------------------------------------------
async function checkAuthOnProtectedPage() {
    try {
        const res = await fetch('/api/me');
        if (!res.ok) {
            // Not authenticated
            window.location.href = 'index.html';
            return;
        }
        const data = await res.json();
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            const displayName = data.display_name || data.username;
            welcomeMessage.innerHTML = `Welcome, <span style="color: var(--accent-color);">${displayName}</span>!`;
        }
    } catch (e) {
        window.location.href = 'index.html';
    }
}

function initLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = 'index.html';
        });
    }
}

function initDashboard() {
    initLogout();
}

function initProfilePage() {
    initLogout();

    // Fetch profile and populate
    fetch('/api/me').then(res => res.json()).then(data => {
        const dnameInput = document.getElementById('display-name');
        if (dnameInput && data.display_name) dnameInput.value = data.display_name;
    });

    // Update Profile
    const updateProfileForm = document.getElementById('update-profile-form');
    if (updateProfileForm) {
        updateProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const displayName = document.getElementById('display-name').value;
            try {
                const res = await fetch('/api/update-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ display_name: displayName })
                });
                const data = await res.json();
                if (!res.ok) {
                    showAlert('profile-alert', data.error || 'Failed to update profile', true);
                } else {
                    showAlert('profile-alert', 'Profile updated successfully!', false);
                }
            } catch (err) {
                showAlert('profile-alert', 'Network error.', true);
            }
        });
    }

    // Change Password
    const changePwdForm = document.getElementById('change-password-form');
    if (changePwdForm) {
        changePwdForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            
            try {
                const res = await fetch('/api/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                const data = await res.json();
                
                if (!res.ok) {
                    showAlert('settings-alert', data.error || 'Failed to change password', true);
                } else {
                    showAlert('settings-alert', 'Password updated successfully!', false);
                    changePwdForm.reset();
                }
            } catch (err) {
                showAlert('settings-alert', 'Network error.', true);
            }
        });
    }
}
