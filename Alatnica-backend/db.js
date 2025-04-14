const sqlite3 = require('sqlite3').verbose();
const DB_PATH = 'mydatabase.db';

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the database');
    db.run(
      'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, email TEXT)'
    );
  }
});

module.exports = db;
