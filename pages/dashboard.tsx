
// File: pages/dashboard.tsx
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';

interface AlertHistoryItem {
  _id: string;
  crypto: string;
  symbol: string;
  previousPrice: number;
  currentPrice: number;
  percentageChange: number;
  timestamp: string;
}

export default function Dashboard() {
  const [alertHistory, setAlertHistory] = useState<AlertHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchAlertHistory = async () => {
      try {
        const res = await axios.get('/api/alert-history');
        setAlertHistory(res.data.history || []);
        setLoading(false);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        setError('Failed to load alert history');
        setLoading(false);
      }
    };
    
    fetchAlertHistory();
    
    // Refresh every minute
    const interval = setInterval(fetchAlertHistory, 60000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Dashboard | Crypto Price Alerter</title>
        <meta name="description" content="View your cryptocurrency price alert history" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-black">Alert History</h1>
          <Link href="/" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
            Back to Settings
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : error ? (
            <div className="text-red-500 text-center py-8">{error}</div>
          ) : alertHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No alert history available yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Date & Time</th>
                    <th className="px-4 py-2 text-left">Cryptocurrency</th>
                    <th className="px-4 py-2 text-right">Previous Price</th>
                    <th className="px-4 py-2 text-right">Current Price</th>
                    <th className="px-4 py-2 text-right">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {alertHistory.map((alert) => (
                    <tr key={alert._id} className="border-b">
                      <td className="px-4 py-2">{new Date(alert.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        {alert.crypto} ({alert.symbol.toUpperCase()})
                      </td>
                      <td className="px-4 py-2 text-right">${alert.previousPrice.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">${alert.currentPrice.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-green-500">
                        +{alert.percentageChange.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
