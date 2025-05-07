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
      const reports = await db.all('SELECT * FROM reports');
      return sendJsonResponse(res, 200, reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      return sendJsonResponse(res, 500, { error: 'Failed to fetch reports' });
    }
  } else if (req.method === 'PATCH') {
    const { id, action } = req.body;

    if (!id || !action) {
      return sendJsonResponse(res, 400, { error: 'Missing id or action in request body' });
      return;
    }

    try {
      if (action === 'reviewed') {
        await db.run('UPDATE reports SET status = ? WHERE id = ?', ['reviewed', id]);
      } else if (action === 'delete') {
        await db.run('DELETE FROM reports WHERE id = ?', [id]);
      } else {
        return sendJsonResponse(res, 400, { error: 'Invalid action' });
        return;
      }

      return sendJsonResponse(res, 200, { success: true });
    } catch (error) {
      console.error('Error updating report:', error);
      return sendJsonResponse(res, 500, { error: 'Failed to update report' });
    }
  } else if (req.method === 'POST') {
    const { propertyId, userId, ownerId, reason, timestamp } = req.body;

    if (!propertyId || !userId || !ownerId || !reason || !timestamp) {
      return sendJsonResponse(res, 400, { error: 'Missing required fields' });
      return;
    }

    try {
      await db.run(
        'INSERT INTO reports (property_id, user_id, owner_id, reason, timestamp) VALUES (?, ?, ?, ?, ?)',
        [propertyId, userId, ownerId, reason, timestamp]
      );
      return sendJsonResponse(res, 201, { success: true });
    } catch (error) {
      console.error('Error submitting report:', error);
      return sendJsonResponse(res, 500, { error: 'Failed to submit report' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PATCH', 'POST']);
    return sendJsonResponse(res, 405, { error: `Method ${req.method} Not Allowed` });
  }
}