import { NextApiRequest, NextApiResponse } from 'next';
import { getDbConnection } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDbConnection();

  if (req.method === 'GET') {
    const { role, userId } = req.query;

    try {
      let query = 'SELECT * FROM notifications';
      const params = [];

      if (role === 'admin') {
        // Admin sees all notifications
      } else if (role === 'owner') {
        query += ' WHERE type LIKE ?';
        params.push('%owner%');
      } else if (role === 'user') {
        query += ' WHERE userId = ?';
        params.push(userId);
      }

      query += ' ORDER BY created_at DESC';

      const notifications = await db.all(query, params);
      res.status(200).json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}