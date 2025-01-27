const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import cors

const app = express();
const PORT = 3001;

// Path to JSON file
const DB_PATH = path.join(__dirname, 'db.json');

app.use(bodyParser.json());
app.use(cors());


// Helper function to load data
function loadData() {
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

// Helper function to save data
function saveData(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Get all spaces
app.get('/api/read', (req, res) => {
  const { spaces , users } = loadData();
  res.json({ spaces, users });
});

app.post('/api/write', (req, res) => {
  const { spaces, users } = req.body;
  saveData({ spaces, users });
  res.json({ status: 'success', success: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
