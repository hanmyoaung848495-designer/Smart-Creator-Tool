import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, contact, message } = req.body;

  if (!name || !contact || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error("Telegram credentials missing in environment variables");
    return res.status(500).json({ error: "Feedback service not configured" });
  }

  const text = `<b>Smart Creator Feedback Received</b>\n\n` +
    `<b>Name:</b> <code>${name}</code>\n` +
    `<b>Contact:</b> <code>${contact}</code>\n` +
    `<b>Message:</b>\n<code>${message}</code>`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
      }),
    });

    if (response.ok) {
      res.json({ success: true });
    } else {
      const errorData = await response.json();
      console.error("Telegram API error:", errorData);
      res.status(500).json({ error: "Failed to send feedback" });
    }
  } catch (error) {
    console.error("Error sending feedback to Telegram:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
