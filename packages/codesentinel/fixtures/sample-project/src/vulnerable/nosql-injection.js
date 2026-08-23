const express = require('express');
const User = require('../models/User');
const router = express.Router();

router.post('/login', async (req, res) => {
  // Vulnerable: passing req.body directly to a NoSQL ODM sink
  const user = await User.findOne(req.body);
  
  if (user) {
    res.send('Logged in');
  } else {
    res.send('Failed');
  }
});

module.exports = router;
