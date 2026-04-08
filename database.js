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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Safely add display_name for existing/new databases
    try {
        db.exec(`ALTER TABLE users ADD COLUMN display_name TEXT`);
    } catch (err) {
        // Will throw an error if the column already exists, which is fine
    }
}

initDb();

module.exports = db;
