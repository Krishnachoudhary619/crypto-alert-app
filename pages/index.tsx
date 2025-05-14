import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import useSWR from 'swr';
import axios from 'axios';

interface Cryptocurrency {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  image: string;
}

interface AlertSettings {
  email: string;
  threshold: number;
  interval: number;
  cryptos: string[];
}

const fetcher = (url: string) => axios.get(url).then(res => res.data);

export default function Home() {
  const [email, setEmail] = useState('');
  const [threshold, setThreshold] = useState(3);
  const [interval, setInterval] = useState(15);
  const [selectedCryptos, setSelectedCryptos] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Fetch popular cryptocurrencies
  const { data: popularCryptos, error } = useSWR('/api/cryptocurrencies', fetcher);
  
  // Fetch user's alert settings if they exist
  useEffect(() => {
    const checkSettings = async () => {
      try {
        const res = await axios.get('/api/alert-settings');
        if (res.data.settings) {
          const settings = res.data.settings;
          setEmail(settings.email);
          setThreshold(settings.threshold);
          setInterval(settings.interval);
          setSelectedCryptos(settings.cryptos);
          setIsSubscribed(true);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    
    checkSettings();
  }, []);
  
  const handleSubscribe = async () => {
    if (!email) {
      setMessage({ text: 'Please enter your email address', type: 'error' });
      return;
    }
    
    if (selectedCryptos.length === 0) {
      setMessage({ text: 'Please select at least one cryptocurrency', type: 'error' });
      return;
    }
    
    try {
      const settings: AlertSettings = {
        email,
        threshold,
        interval,
        cryptos: selectedCryptos,
      };
      
      await axios.post('/api/alert-settings', settings);
      setIsSubscribed(true);
      setMessage({ text: 'Alert settings saved successfully! You will receive email notifications when prices change by your threshold.', type: 'success' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ text: 'Failed to save alert settings. Please try again.', type: 'error' });
    }
  };
  
  const handleUnsubscribe = async () => {
    try {
      await axios.delete('/api/alert-settings');
      setIsSubscribed(false);
      setMessage({ text: 'Unsubscribed successfully. You will no longer receive alerts.', type: 'success' });
    } catch (error) {
      console.error('Error unsubscribing:', error);
      setMessage({ text: 'Failed to unsubscribe. Please try again.', type: 'error' });
    }
  };
  
  const handleCryptoSelection = (id: string) => {
    setSelectedCryptos(prev => 
      prev.includes(id) 
        ? prev.filter(c => c !== id) 
        : [...prev, id]
    );
  };
  
  const filteredCryptos = popularCryptos?.filter((crypto: Cryptocurrency) => 
    crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Crypto Price Alerter</title>
        <meta name="description" content="Get alerts when cryptocurrency prices change" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Cryptocurrency Price Alerter</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Alert Settings</h2>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubscribed}
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="threshold">
                Alert Threshold (%)
              </label>
              <input
                type="number"
                id="threshold"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                disabled={isSubscribed}
                min="0.1"
                step="0.1"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="interval">
                Check Interval (minutes)
              </label>
              <input
                type="number"
                id="interval"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                disabled={isSubscribed}
                min="5"
                step="1"
                required
              />
            </div>
          </div>
          
          {isSubscribed ? (
            <button
              onClick={handleUnsubscribe}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
            >
              Unsubscribe from Alerts
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
              Subscribe to Alerts
            </button>
          )}
          
          {message.text && (
            <div className={`mt-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message.text}
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Select Cryptocurrencies</h2>
          
          <div className="mb-4">
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Search cryptocurrencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isSubscribed}
            />
          </div>
          
          {error ? (
            <div className="text-red-500">Failed to load cryptocurrencies</div>
          ) : !popularCryptos ? (
            <div className="text-gray-500">Loading cryptocurrencies...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCryptos.map((crypto: Cryptocurrency) => (
                <div 
                  key={crypto.id}
                  className={`border rounded-md p-3 flex items-center cursor-pointer ${
                    selectedCryptos.includes(crypto.id) ? 'bg-blue-50 border-blue-300' : ''
                  }`}
                  onClick={() => !isSubscribed && handleCryptoSelection(crypto.id)}
                >
                  <img src={crypto.image} alt={crypto.name} className="w-8 h-8 mr-3" />
                  <div className="flex-1">
                    <h3 className="font-medium">{crypto.name}</h3>
                    <p className="text-gray-500 text-sm">{crypto.symbol.toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${crypto.current_price.toLocaleString()}</p>
                    <p className={crypto.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {crypto.price_change_percentage_24h.toFixed(2)}%
                    </p>
                  </div>
                  {selectedCryptos.includes(crypto.id) && (
                    <div className="ml-3 text-blue-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="mt-8 text-center text-gray-500">
          <p>© {new Date().getFullYear()} Crypto Price Alerter. All rights reserved.</p>
          <p className="mt-2">
            <Link href="/dashboard" className="text-blue-500 hover:underline">
              Dashboard
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
