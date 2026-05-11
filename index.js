const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Your Neon/Postgres connection string
const connectionString = 'postgresql://neondb_owner:npg_F9cJaSgT3xYo@ep-winter-leaf-aq1bpt7c.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require';
const db = new Pool({ connectionString });

// Create necessary tables
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
      position VARCHAR(30) NOT NULL,
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
    if (err.code === '23505') { // already registered
      res.send('School ID already registered.');
    } else {
      res.status(500).send('Error registering.');
    }
  }
});

// Vote
app.post('/vote', async (req, res) => {
  const { school_id, president, vp } = req.body;
  let officers = req.body.officers;

  // Ensure officers is always an array if submitted
  if (officers && !Array.isArray(officers)) officers = [officers];

  try {
    // Check student + already voted
    const student = await db.query('SELECT has_voted FROM students WHERE school_id = $1',[school_id]);
    if (student.rows.length === 0) return res.send('School ID not registered.');
    if (student.rows[0].has_voted) return res.send('You have already voted.');

    // Max officer choice validation (shouldn't trigger due to frontend JS, but double check)
    if (officers && officers.length > 5) {
      return res.send('Select up to 5 officers only.');
    }

    // Build all votes
    const voteInserts = [];
    if (president) voteInserts.push(['President', president]);
    if (vp) voteInserts.push(['Vice President', vp]);
    if (officers && officers.length)
      officers.forEach(officer => voteInserts.push(['Officer', officer]));

    // Save votes
    for (const [position, candidate] of voteInserts) {
      await db.query(
        'INSERT INTO votes (school_id, position, candidate) VALUES ($1, $2, $3)',
        [school_id, position, candidate]
      );
    }

    // Mark as voted
    await db.query(
      'UPDATE students SET has_voted = TRUE WHERE school_id = $1',
      [school_id]
    );

    // Success popup
    res.redirect('/?vote=success');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error voting.');
  }
});

// Results: grouped by position/candidate for frontend
app.get('/results', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT position, candidate, COUNT(*) AS count
      FROM votes
      GROUP BY position, candidate
      ORDER BY position, candidate
    `);
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