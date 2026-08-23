const express = require('express');
const User = require('../models/User');
const router = express.Router();

router.post('/login', async (req, res) => {
  // Safe: extracting specific scalar properties
  const username = String(req.body.username);
  const password = String(req.body.password);
  
  const user = await User.findOne({ username, password });
  
  if (user) {
    res.send('Logged in');
  } else {
    res.send('Failed');
  }
});

module.exports = router;
