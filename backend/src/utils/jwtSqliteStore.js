// backend/src/utils/jwtSqliteStore.js
// Stores JWT tokens in SQLite for compliance with unit 2 requirement.

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../../jwt_tokens.db');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS jwt_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    token TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

function saveJwtToken(userId, token) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO jwt_tokens (userId, token) VALUES (?, ?)',
      [userId, token],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

function deleteJwtTokensForUser(userId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM jwt_tokens WHERE userId = ?', [userId], function (err) {
      if (err) return reject(err);
      resolve(this.changes);
    });
  });
}

module.exports = { saveJwtToken, deleteJwtTokensForUser };
