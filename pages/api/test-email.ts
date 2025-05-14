// pages/api/test-email.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendAlert } from './check-prices'; // Adjust path if needed

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const result = await sendAlert(
    'krishna.p.choudhary.20@gmail.com', // <-- Replace with your real test email
    'Bitcoin',
    'btc',
    30000,
    33000,
    10
  );

  if (result) {
    res.status(200).json({ success: true, message: 'Email sent!' });
  } else {
    res.status(500).json({ success: false, message: 'Failed to send email.' });
  }
}
