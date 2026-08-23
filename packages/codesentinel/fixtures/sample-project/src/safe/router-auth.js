const express = require('express');
const router = express.Router();

const requireAuth = (req, res, next) => next();

// Safe: Has auth middleware
router.post('/admin/delete', requireAuth, (req, res) => {
  res.send('Deleted');
});

// Safe: Has auth middleware in an array
router.put('/admin/update', [requireAuth], (req, res) => {
  res.send('Updated');
});

module.exports = router;
