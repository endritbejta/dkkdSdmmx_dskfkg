const Database = require('better-sqlite3');
const path = require('path');

// Connect to SQLite database (creates the file if it doesn't exist)
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Initialize the database tables
function initDb() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_paid BOOLEAN DEFAULT 0,
            is_admin BOOLEAN DEFAULT 0
        )
    `);

    // Safely add columns for existing/new databases (ignoring errors if columns exist)
    const migrations = [
        `ALTER TABLE users ADD COLUMN display_name TEXT`,
        `ALTER TABLE users ADD COLUMN is_paid BOOLEAN DEFAULT 0`,
        `ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0`
    ];
    
    migrations.forEach(mig => {
        try { db.exec(mig); } catch(err) {} 
    });
}

initDb();

module.exports = db;
