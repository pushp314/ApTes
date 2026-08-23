// @ts-nocheck
// vulnerable.ts
// This file contains intentionally broken code to test CodeSentinel security and logic rules.

const express = require('express');
const app = express();
const db = require('./db');
const { exec } = require('child_process');

// 1. Secrets Rule
const API_KEY = "sk-1234567890123456789012345678901234567890";
const github_token = "ghp_abcdefghijklmnopqrstuvwxyz1234567890";

// 2. Logic Contradictions
function doLogic() {
  if (true) {
    console.log("Always true");
  }
  
  let x = 1;
  if (x === true && x === false) {
    console.log("Contradiction");
  }
}

// 3. API Integration (Missing .ok check)
async function fetchData() {
  const response = await fetch('http://localhost:3000/api/users'); // Missing .ok handling
  const data = await response.json();
  return data;
}

// 4. Contract Mismatch (Frontend calling non-existent backend route)
async function fetchBrokenRoute() {
  await fetch('/api/does-not-exist'); 
}

// 5. Auth Rule (Missing auth on sensitive route)
app.post('/api/admin/settings', (req, res) => {
  res.send('Settings updated');
});

// 6. Injection (SQLi and Command)
app.get('/api/users', (req, res) => {
  const id = req.query.id;
  
  // SQLi
  db.query(`SELECT * FROM users WHERE id = ${id}`);
  
  // Command Injection
  exec("ping -c 1 " + req.query.host, (err, stdout) => {
    res.send(stdout);
  });
});
