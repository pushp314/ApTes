import express from 'express';
import { unsafeQuery } from './cross-file-db';

const router = express.Router();

router.post('/login', (req, res) => {
  // Source is req.body, passed into a function in another file
  unsafeQuery(req.body);
  res.send('Done');
});

export default router;
