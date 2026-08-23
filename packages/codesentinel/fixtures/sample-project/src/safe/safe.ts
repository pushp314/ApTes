// @ts-nocheck
// safe.ts
// This file contains safe code that should not trigger CodeSentinel rules.

const express = require('express');
const app = express();
const db = require('./db');
const { spawn } = require('child_process');

// 1. Secrets Rule (Safe use of env vars)
const API_KEY = process.env.API_KEY || '';

// 2. Logic Contradictions (Dynamic logic)
function doLogic(condition: boolean) {
  if (condition) {
    console.log("Dynamic condition");
  }
}

// 3. API Integration (Proper error handling)
async function fetchData() {
  const response = await fetch('http://localhost:3000/api/users');
  if (!response.ok) {
    throw new Error('API failed');
  }
  const data = await response.json();
  return data;
}

// 4. Contract Validation (Calling an existing backend route)
async function fetchValidRoute() {
  const response = await fetch('/api/users');
  if (response.ok) {
    return response.json();
  }
}

// 5. Auth Rule (Auth applied to sensitive route)
function requireAuth(req, res, next) {
  next();
}

app.post('/api/admin/settings', requireAuth, (req, res) => {
  res.send('Settings updated');
});

// 6. Injection (Parameterized queries and safe spawn)
app.get('/api/users', (req, res) => {
  const id = req.query.id;
  
  // Parameterized query (safe)
  db.query('SELECT * FROM users WHERE id = ?', [id]);
  
  // Safe spawn with args array
  spawn("ping", ["-c", "1", req.query.host]);
});
