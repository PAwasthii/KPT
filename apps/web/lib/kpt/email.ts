export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[KPT EMAIL MOCK] To: ${to}\nSubject: ${subject}\nBody:\n${body}`);
    return;
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'KPT Industries <noreply@kpt.co.in>',
      to: [to],
      subject,
      html: body,
    }),
  });
}
