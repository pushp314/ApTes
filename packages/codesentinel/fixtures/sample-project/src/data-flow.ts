import { app, db, exec } from './external';

// 1. Missing Auth with Variables
const adminRoute = '/api/admin/settings/advanced';
app.get(adminRoute, (req, res) => {
  res.send('Secret Settings');
});

// 2. SQL Injection with Variables
export function fetchUser(req: any) {
  const table = 'users';
  const query = `SELECT * FROM ${table} WHERE id = ${req.body.id}`;
  
  // db.query receives an Identifier, not a TemplateExpression directly
  db.query(query);
}

// 3. Command Injection with Variables
export function doPing(ip: string) {
  const cmd = "ping -c 4 " + ip;
  exec(cmd);
}
