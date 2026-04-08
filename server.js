const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
    secret: 'super-secret-crypto-key', // In production, use env variables
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// Protect static frontend routes for authenticated users except index
app.use('/app.html', requireAuth);
app.use('/profile.html', requireAuth);
app.use('/reader.html', requireAuth);

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    // If attempting to fetch API
    if (req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/book.pdf')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // Otherwise redirect browser to login
    return res.redirect('/');
}

// ------ API ROUTES ------

// 1. Register a new user
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Grant admin and paid status automatically if it is the owner
        let isAdmin = 0;
        let isPaid = 0;
        if (username.toLowerCase() === 'endrit.bejta@hotmail.com') {
            isAdmin = 1;
            isPaid = 1;
        }

        const stmt = db.prepare('INSERT INTO users (username, password_hash, is_admin, is_paid) VALUES (?, ?, ?, ?)');
        const info = stmt.run(username, hashedPassword, isAdmin, isPaid);
        
        // Auto-login after register
        req.session.userId = info.lastInsertRowid;
        req.session.username = username;
        
        res.json({ message: 'User registered successfully!' });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: 'Username already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
        const user = stmt.get(username);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.json({ message: 'Login successful', username: user.username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

// 4. Change Password
app.post('/api/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Both current and new passwords are required' });
    }

    try {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = stmt.get(req.session.userId);

        const match = await bcrypt.compare(currentPassword, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const updateStmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        updateStmt.run(hashedNewPassword, req.session.userId);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 5. Get current user info
app.get('/api/me', requireAuth, (req, res) => {
    try {
        const stmt = db.prepare('SELECT username, display_name, is_paid, is_admin FROM users WHERE id = ?');
        const user = stmt.get(req.session.userId);
        if (user) {
            res.json({ 
                username: user.username, 
                display_name: user.display_name,
                is_paid: !!user.is_paid,
                is_admin: !!user.is_admin
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 6. Update Profile
app.post('/api/update-profile', requireAuth, (req, res) => {
    const { display_name } = req.body;
    try {
        const stmt = db.prepare('UPDATE users SET display_name = ? WHERE id = ?');
        stmt.run(display_name, req.session.userId);
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ------ ADMIN API ROUTES ------

app.get('/api/admin/users', requireAuth, (req, res) => {
    const adminCheck = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.session.userId);
    if (!adminCheck || !adminCheck.is_admin) return res.status(403).json({ error: 'Forbidden' });
    
    try {
        const users = db.prepare('SELECT id, username, display_name, created_at, is_paid, is_admin FROM users ORDER BY created_at DESC').all();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/admin/verify', requireAuth, (req, res) => {
    const adminCheck = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.session.userId);
    if (!adminCheck || !adminCheck.is_admin) return res.status(403).json({ error: 'Forbidden' });
    
    const { userId, isPaid } = req.body;
    try {
        db.prepare('UPDATE users SET is_paid = ? WHERE id = ?').run(isPaid ? 1 : 0, userId);
        res.json({ message: 'User status successfully updated' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ------ PROTECTED PDF ROUTE ------

// Serve the PDF only if logged in
app.get('/book.pdf', requireAuth, (req, res) => {
    const user = db.prepare('SELECT is_paid FROM users WHERE id = ?').get(req.session.userId);
    const isPaid = user && user.is_paid;
    
    // Serve preview to unpaid users, full book for paid
    const fileName = isPaid ? 'book.pdf' : 'preview.pdf';
    const filePath = path.join(__dirname, fileName);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('PDF not found.');
    }
});


// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
