import { app, db, requireAuth } from './external';

// 1. Vulnerable to IDOR: Uses req.params.id but does NOT verify req.user.id
app.get('/api/users/:id/private-data', requireAuth, (req, res) => {
  const userId = req.params.id;
  
  // VULNERABILITY: No check against req.user.id
  const data = db.query(`SELECT * FROM private_data WHERE user_id = ${userId}`);
  res.json(data);
});

// 2. Safe from IDOR: Uses req.user.id to verify ownership
app.get('/api/users/:id/secure-data', requireAuth, (req, res) => {
  const userId = req.params.id;
  const ownerId = req.user.id; // Verify ownership
  
  // SAFE: Scoped to ownerId
  const data = db.query(`SELECT * FROM private_data WHERE user_id = ${userId} AND owner_id = ${ownerId}`);
  res.json(data);
});
