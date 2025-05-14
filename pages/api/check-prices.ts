import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient,ObjectId } from 'mongodb';
import axios from 'axios';
import nodemailer from 'nodemailer';

const EMAIL_FROM = process.env.EMAIL_FROM as string;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD as string;
const MONGODB_URI = process.env.MONGODB_URI as string;


interface CryptoPriceData {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
}

const transporter = nodemailer.createTransport({
  service: 'gmail',  // You can change this to another service like 'outlook', 'yahoo', etc.
  auth: {
    user: EMAIL_FROM,
    pass: EMAIL_PASSWORD,
  },
});

interface AlertSettings {
  _id: string;
  email: string;
  threshold: number;
  interval: number;
  cryptos: string[];
  lastChecked?: Date;
  lastPrices?: Record<string, number>;
}

 export async function sendAlert(
  email: string,
  crypto: string,
  symbol: string,
  previousPrice: number,
  currentPrice: number,
  percentageChange: number
) {
  const msg = {
    from: EMAIL_FROM,
    to: email,
    subject: `🚨 Price Alert: ${crypto} has increased by ${percentageChange.toFixed(2)}%!`,
    html: `
      <h2>Cryptocurrency Price Alert</h2>
      <p>Good news! ${crypto} (${symbol.toUpperCase()}) has increased by ${percentageChange.toFixed(2)}%.</p>
      <p>
        <strong>Previous price:</strong> $${previousPrice.toLocaleString()}<br>
        <strong>Current price:</strong> $${currentPrice.toLocaleString()}<br>
        <strong>Change:</strong> +${percentageChange.toFixed(2)}%
      </p>
      <p>This alert was sent to you by Crypto Price Alerter.</p>
    `,
  };

  try {
    await transporter.sendMail(msg);
    console.log(`Alert email sent to ${email} for ${crypto}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // This endpoint should only be called by a Vercel Cron Job
  // For security, it requires authorization
  // In a real application, you would implement proper authentication
  const authHeader = req.headers.authorization;
  
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('crypto-alerter');
    const settingsCollection = db.collection('alert-settings');
    const alertsCollection = db.collection('alerts');
    
    // Get all active alert settings
    const rawSettings = await settingsCollection.find({}).toArray();

const allSettings: AlertSettings[] = rawSettings.map((doc) => ({
  _id: doc._id.toString(),
  email: doc.email,
  threshold: doc.threshold,
  interval: doc.interval,
  cryptos: doc.cryptos,
  lastChecked: doc.lastChecked ? new Date(doc.lastChecked) : undefined,
  lastPrices: doc.lastPrices ?? {},
}));

    
    if (allSettings.length === 0) {
      return res.status(200).json({ message: 'No alert settings found' });
    }
    
    // Create a set of all unique cryptocurrencies to check
    const uniqueCryptos = new Set<string>();
    allSettings.forEach(setting => {
      setting.cryptos.forEach(crypto => uniqueCryptos.add(crypto));
    });
    
    // Fetch current prices for all cryptocurrencies
    const cryptoIds = Array.from(uniqueCryptos).join(',');
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
          ids: cryptoIds,
          per_page: 250,
          page: 1,
          sparkline: false
        }
      }
    );
    
    const currentPrices: Record<string, CryptoPriceData> = {};
    response.data.forEach((crypto: CryptoPriceData) => {
      currentPrices[crypto.id] = crypto;
    });
    
    // Check each user's settings and send alerts if needed
    const alerts = [];
    
    for (const setting of allSettings) {
      const { _id, email, threshold, cryptos, lastPrices = {} } = setting;
      
      for (const cryptoId of cryptos) {
        const cryptoData = currentPrices[cryptoId];
        
        if (!cryptoData) continue;
        
        const previousPrice = lastPrices[cryptoId];
        const currentPrice = cryptoData.current_price;
        
        // Skip if we don't have a previous price to compare
        if (previousPrice === undefined) continue;
        
        // Calculate percentage change
        const percentageChange = ((currentPrice - previousPrice) / previousPrice) * 100;
        
        // Send alert if price increased above threshold
        if (percentageChange >= threshold) {
          const alertData = {
            settingId: _id,
            email,
            crypto: cryptoData.name,
            symbol: cryptoData.symbol,
            previousPrice,
            currentPrice,
            percentageChange,
            timestamp: new Date()
          };
          
          // Save alert to database
          await alertsCollection.insertOne(alertData);
          alerts.push(alertData);
          
          // Send email alert
          await sendAlert(
            email,
            cryptoData.name,
            cryptoData.symbol,
            previousPrice,
            currentPrice,
            percentageChange
          );

        }
      }
      
      // Update last checked time and prices
      const newLastPrices: Record<string, number> = {};
      for (const cryptoId of cryptos) {
        if (currentPrices[cryptoId]) {
          newLastPrices[cryptoId] = currentPrices[cryptoId].current_price;
        }
      }
      await settingsCollection.updateOne(
  { _id: new ObjectId(setting._id) },
  {
    $set: {
      lastChecked: new Date(),
      lastPrices: newLastPrices
    }
  }
);
    }
    
    return res.status(200).json({
      message: `Checked prices for ${uniqueCryptos.size} cryptocurrencies`,
      alertsSent: alerts.length,
      alerts
    });
  } catch (error) {
    console.error('Error checking prices:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  } finally {
    await client.close();
  }
}