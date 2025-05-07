import { NextApiRequest, NextApiResponse } from 'next';
import { getDbConnection } from '@/lib/db';

// Helper function to ensure JSON response
const sendJsonResponse = (res: NextApiResponse, statusCode: number, data: any) => {
  res.setHeader('Content-Type', 'application/json');
  return res.status(statusCode).json(data);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDbConnection();

  if (req.method === 'GET') {
    try {
      // Simulate fetching the current user from session or token
      const simulatedUid = req.headers['x-simulated-uid'] || '1'; // Replace with actual session logic

      const user = await db.get('SELECT * FROM users WHERE uid = ?', [simulatedUid]);

      if (!user) {
        return sendJsonResponse(res, 404, { error: 'User not found' });
      }

      return sendJsonResponse(res, 200, user);
    } catch (error) {
      console.error('Error fetching current user:', error);
      return sendJsonResponse(res, 500, { error: 'Failed to fetch current user' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return sendJsonResponse(res, 405, { error: `Method ${req.method} Not Allowed` });
  }
}