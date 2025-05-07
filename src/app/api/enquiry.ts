import { NextApiRequest, NextApiResponse } from 'next';
import { getDbConnection } from '@/lib/db';

// Helper function to ensure JSON response
const sendJsonResponse = (res: NextApiResponse, statusCode: number, data: any) => {
  res.setHeader('Content-Type', 'application/json');
  return res.status(statusCode).json(data);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDbConnection();

  if (req.method === 'POST') {
    const { propertyId, userId, ownerId, propertyDetails } = req.body;

    try {
      // Send notification to the user
      await db.run(
        'INSERT INTO notifications (userId, type, title, message, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [
          userId,
          'property_enquiry',
          `Enquiry Sent: ${propertyDetails.title}`,
          `You enquired about ${propertyDetails.title}. Details: ${JSON.stringify(propertyDetails)}`,
          'unread',
          new Date().toISOString(),
        ]
      );

      // Send notification to the property owner
      await db.run(
        'INSERT INTO notifications (userId, type, title, message, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [
          ownerId,
          'property_enquiry',
          `New Enquiry: ${propertyDetails.title}`,
          `User ${userId} has enquired about your property: ${propertyDetails.title}.`,
          'unread',
          new Date().toISOString(),
        ]
      );

      return sendJsonResponse(res, 200, { message: 'Enquiry processed successfully' });
    } catch (error) {
      console.error('Error processing enquiry:', error);
      return sendJsonResponse(res, 500, { error: 'Failed to process enquiry' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return sendJsonResponse(res, 405, { error: `Method ${req.method} Not Allowed` });
  }
}