// Vulnerable API endpoint
interface Request { params: { id: string }; query: { id: string } }
interface Response { json: (data: any) => void; status: (code: number) => { send: (msg: string) => void } }
declare const db: { query: (sql: string, params?: any[]) => Promise<any> };

export const getUser = async (req: Request, res: Response) => {
  // Vulnerable to SQL injection
  const user = await db.query(`SELECT * FROM users WHERE id = ${req.query.id}`);
  res.json(user);
};
