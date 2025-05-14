import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await client.connect();
    const database = client.db('crypto-alerter');
    const alerts = database.collection('alerts');
    
    // In a real app, you'd use authentication to get the user's alerts
    // For now, we're just getting the most recent 50 alerts
    const history = await alerts
      .find({})
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
    
    return res.status(200).json({ history });
  } catch (error) {
    console.error('Error fetching alert history:', error);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    await client.close();
  }
}