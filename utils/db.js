const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const dbFile = path.join(__dirname, '..', 'database.sqlite');

const dbExists = fs.existsSync(dbFile);

const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados', err);
  } else {
    if (!dbExists) {
      createTables();
    }
    console.log('Conectado ao banco de dados SQLite.');
  }
});

function createTables() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        fullName TEXT NOT NULL,
        email TEXT NOT NULL,
        photo TEXT,
        pronouns TEXT,
        bio TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        photo TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        movieId INTEGER NOT NULL,
        rating REAL NOT NULL,
        reviewText TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id),
        FOREIGN KEY(movieId) REFERENCES movies(id)
      )
    `);
  });
}

// ---------- FUNÇÕES DO BANCO ---------- //

function getUserByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function createUser(username, password, fullName, email) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (username, password, fullName, email) VALUES (?, ?, ?, ?)',
      [username, password, fullName, email],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function updateUserProfile(userId, photo, pronouns, bio, fullName, email) {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE users
      SET photo = ?, pronouns = ?, bio = ?, fullName = ?, email = ?
      WHERE id = ?
    `;
    db.run(query, [photo, pronouns, bio, fullName, email, userId], function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

function createMovie(name, photo) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO movies (name, photo) VALUES (?, ?)',
      [name, photo],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function searchMoviesByName(name) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        m.id,
        m.name,
        m.photo,
        (SELECT COUNT(*) FROM reviews r WHERE r.movieId = m.id) AS reviewCount
      FROM movies m
      WHERE m.name LIKE ?
    `;

    db.all(query, [`%${name}%`], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function createReview(userId, movieId, rating, reviewText) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO reviews (userId, movieId, rating, reviewText) VALUES (?, ?, ?, ?)',
      [userId, movieId, rating, reviewText],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getReviewsByMovie(movieId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        r.id, r.rating, r.reviewText, r.createdAt,
        u.username
      FROM reviews r
      JOIN users u ON r.userId = u.id
      WHERE r.movieId = ?
      ORDER BY r.createdAt DESC
    `;

    db.all(query, [movieId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getReviewsByUser(userId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        r.id,
        r.rating,
        r.reviewText,
        r.createdAt,
        m.name AS movieName,
        m.photo AS moviePhoto
      FROM reviews r
      JOIN movies m ON r.movieId = m.id
      WHERE r.userId = ?
      ORDER BY r.createdAt DESC
    `;

    db.all(query, [userId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getPublicUserInfo(username) {
  return new Promise((resolve, reject) => {
    const queryUser = `
      SELECT id, fullName, username, pronouns, photo, bio
      FROM users
      WHERE username = ?
    `;

    db.get(queryUser, [username], (err, userRow) => {
      if (err) {
        reject(err);
      } else if (!userRow) {
        resolve(null);
      } else {
        getReviewsByUser(userRow.id)
          .then((reviews) => {
            resolve({
              ...userRow,
              reviews
            });
          })
          .catch(reject);
      }
    });
  });
}

function deleteUser(userId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
      if (err) reject(err);
      else resolve(this.changes); // quantas linhas foram afetadas
    });
  });
}

function deleteReview(reviewId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM reviews WHERE id = ?', [reviewId], function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

// EXPORTS
module.exports = {
  db,
  getUserByUsername,
  createUser,
  updateUserProfile,
  createMovie,
  searchMoviesByName,
  createReview,
  getReviewsByMovie,
  getReviewsByUser,
  getPublicUserInfo,
  deleteUser,
  deleteReview
};