export async function sendSMS(mobile: string, message: string): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[KPT SMS MOCK] To: ${mobile}\nMessage: ${message}`);
    return;
  }
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) throw new Error('FAST2SMS_API_KEY not configured');
  // Fast2SMS DLT route
  await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: { authorization: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      route: 'dlt',
      sender_id: 'KPTTLS',
      message,
      variables_values: '',
      flash: 0,
      numbers: mobile,
    }),
  });
}
