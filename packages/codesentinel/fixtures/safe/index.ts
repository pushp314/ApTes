// Safe API endpoint
interface Request { params: { id: string }; query: { id: string } }
interface Response { json: (data: any) => void; status: (code: number) => { send: (msg: string) => void } }
declare const db: { query: (sql: string, params?: any[]) => Promise<any> };

export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    res.json(user);
  } catch (err) {
    res.status(500).send('Error');
  }
};
