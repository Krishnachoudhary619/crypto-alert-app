import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, } from 'mongodb';

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await client.connect();
    const database = client.db('crypto-alerter');
    const settings = database.collection('alert-settings');

    // GET: Retrieve alert settings
    if (req.method === 'GET') {
      // In a real app, you'd use authentication to get the user's ID
      // For now, we're just getting the most recent settings
      const result = await settings.findOne({}, { sort: { _id: -1 } });
      
      return res.status(200).json({ settings: result });
    }
    
    // POST: Save alert settings
    if (req.method === 'POST') {
      const { email, threshold, interval, cryptos } = req.body;
      
      if (!email || !threshold || !interval || !cryptos || cryptos.length === 0) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const result = await settings.insertOne({
        email,
        threshold,
        interval,
        cryptos,
        createdAt: new Date()
      });
      
      return res.status(201).json({ message: 'Settings saved', id: result.insertedId });
    }
    
    // DELETE: Remove alert settings
    if (req.method === 'DELETE') {
      // In a real app, you'd use authentication to delete the user's settings
      // For now, we're just deleting the most recent settings
   await settings.findOneAndDelete({}, { sort: { _id: -1 } });
      
      return res.status(200).json({ message: 'Settings deleted' });
    }
    
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error with alert settings:', error);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    await client.close();
  }
}