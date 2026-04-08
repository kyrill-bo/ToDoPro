import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json());

// Init DB file if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ projects: [], boards: [] }, null, 2));
}

// Load data
app.get('/api/data', (req, res) => {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: 'Failed to read database file' });
  }
});

// Save data
app.post('/api/save', (req, res) => {
  try {
    const { projects, boards } = req.body;
    fs.writeFileSync(DB_FILE, JSON.stringify({ projects, boards }, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save to database file' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Database file: ${DB_FILE}`);
});
