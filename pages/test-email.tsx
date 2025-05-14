import { useState } from 'react';

export default function TestEmailPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const sendTestEmail = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/test-email');
      const data = await res.json();
      setMessage(data.message);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setMessage('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Send Test Email</h1>
      <button onClick={sendTestEmail} disabled={loading}>
        {loading ? 'Sending...' : 'Send Test Email'}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}
