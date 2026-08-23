const express = require('express');
const router = express.Router();

// Vulnerable: Missing auth middleware on a sensitive route
router.post('/admin/delete', (req, res) => {
  res.send('Deleted');
});

// Vulnerable: Empty middleware array on a sensitive route
router.put('/admin/update', [], (req, res) => {
  res.send('Updated');
});

module.exports = router;
