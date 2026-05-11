const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Replace this with your Neon connection string (keep it secret in prod with env vars!)
const connectionString = 'postgresql://neondb_owner:npg_F9cJaSgT3xYo@ep-winter-leaf-aq1bpt7c.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require';

const db = new Pool({
  connectionString
});

// Table Creation Queries
const createTables = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      school_id VARCHAR(64) UNIQUE NOT NULL,
      name VARCHAR(128) NOT NULL,
      has_voted BOOLEAN DEFAULT FALSE
    );
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      school_id VARCHAR(64) REFERENCES students(school_id),
      candidate VARCHAR(64) NOT NULL
    );
  `);
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Register student
app.post('/register', async (req, res) => {
  const { school_id, name } = req.body;
  try {
    await db.query(
      'INSERT INTO students (school_id, name) VALUES ($1, $2)',
      [school_id, name]
    );
    res.redirect('/');
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      res.send('School ID already registered.');
    } else {
      res.status(500).send('Error registering.');
    }
  }
});

// Vote
app.post('/vote', async (req, res) => {
  const { school_id, candidate } = req.body;
  try {
    const student = await db.query(
      'SELECT has_voted FROM students WHERE school_id = $1',
      [school_id]
    );
    if (student.rows.length === 0) {
      return res.send('School ID not registered.');
    }
    if (student.rows[0].has_voted) {
      return res.send('You have already voted.');
    }
    // Record vote
    await db.query(
      'INSERT INTO votes (school_id, candidate) VALUES ($1, $2)',
      [school_id, candidate]
    );
    // Mark as voted
    await db.query(
      'UPDATE students SET has_voted = TRUE WHERE school_id = $1',
      [school_id]
    );
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Error voting.');
  }
});

// Live results
app.get('/results', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT candidate, COUNT(*) AS count FROM votes GROUP BY candidate'
    );
    res.json(result.rows);
  } catch (err) {
    res.json([]);
  }
});

// Startup
const start = async () => {
  try {
    await createTables();
    app.listen(3000, () => {
      console.log('Server running at http://localhost:3000');
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
};

start();