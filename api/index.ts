// Fixes for node-telegram-bot-api in serverless environments
process.env.NTBA_FIX_319 = "1";
process.env.NTBA_FIX_350 = "1";

import express from "express";
import { botService } from '../services/botService';
import TelegramBot from "node-telegram-bot-api";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Initialize Telegram Bot
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_CHAT_ID;
const appUrl = process.env.APP_URL; 
let bot: TelegramBot | null = null;

if (botToken) {
  bot = new TelegramBot(botToken, { polling: false });
  console.log("Telegram bot initialized (Webhook mode).");

  bot.on("message", (msg) => {
    console.log(`[Bot] Message from ${msg.chat.id}: ${msg.text}`);
  });

  bot.onText(/\/start/, (msg) => botService.handleStart(bot, msg.chat.id));
  bot.onText(/\/help/, (msg) => botService.handleHelp(bot, msg.chat.id, adminChatId!));

  bot.onText(/\/setwebhook/, async (msg) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    if (!appUrl) {
      bot?.sendMessage(msg.chat.id, "❌ APP_URL is not set in Environment Variables.");
      return;
    }
    const webhookUrl = `${appUrl}/api/telegram-webhook`;
    try {
      await bot?.setWebHook(webhookUrl);
      bot?.sendMessage(msg.chat.id, `✅ Webhook set to: ${webhookUrl}`);
    } catch (err: any) {
      bot?.sendMessage(msg.chat.id, `❌ Error setting webhook: ${err.message}`);
    }
  });

  bot.onText(/\/stats(?:\s+(.*))?/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    await botService.handleStats(bot, msg.chat.id, match?.[1]?.trim());
  });

  bot.onText(/\/post\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const input = match?.[1];
    if (!input) return;
    await botService.handlePost(bot, msg.chat.id, input);
  });

  bot.onText(/\/listposts/, async (msg) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    await botService.handleListPosts(bot, msg.chat.id);
  });

  bot.onText(/\/delpost\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const id = match?.[1]?.trim();
    if (!id) return;
    await botService.handleDeletePost(bot, msg.chat.id, id);
  });

  bot.onText(/\/checkpost\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const id = match?.[1]?.trim();
    if (!id) return;
    await botService.handleCheckPost(bot, msg.chat.id, id);
  });

  bot.onText(/\/playlist\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const input = match?.[1];
    if (!input) return;
    await botService.handlePlaylist(bot, msg.chat.id, input);
  });

  bot.onText(/\/listplaylist/, async (msg) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    await botService.handleListPlaylist(bot, msg.chat.id);
  });

  bot.onText(/\/delplaylist/, async (msg) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    await botService.handleDelPlaylist(bot, msg.chat.id);
  });

  // Ban Management Commands
  bot.onText(/\/ban\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const sessionId = match?.[1]?.trim();
    if (!sessionId) return;
    await botService.handleBan(bot, msg.chat.id, sessionId);
  });

  bot.onText(/\/unban\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const sessionId = match?.[1]?.trim();
    if (!sessionId) return;
    await botService.handleUnban(bot, msg.chat.id, sessionId);
  });

  bot.onText(/\/listbans/, async (msg) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    await botService.handleListBans(bot, msg.chat.id);
  });
}

// API routes
app.get("/api/set-webhook", async (req, res) => {
  if (!bot || !appUrl) {
    return res.status(500).json({ error: "Bot or APP_URL not configured" });
  }
  const webhookUrl = `${appUrl}/api/telegram-webhook`;
  try {
    await bot.setWebHook(webhookUrl);
    res.json({ success: true, url: webhookUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/api/telegram-webhook", "/telegram-webhook"], (req, res) => {
  console.log("[Webhook] Received update:", JSON.stringify(req.body));
  res.status(200).send("OK");

  if (bot && req.body && req.body.update_id) {
    try {
      bot.processUpdate(req.body);
    } catch (err) {
      console.error("[Webhook] Error processing update:", err);
    }
  }
});

app.post(["/api/feedback", "/feedback"], async (req, res) => {
  const { name, contact, message, sessionId } = req.body;
  console.log("[Feedback] Received:", { name, contact, message, sessionId });

  if (!name || !contact || !message || !sessionId) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (!botToken || !adminChatId) {
    console.error("[Feedback] Bot not configured:", { botToken: !!botToken, adminChatId: !!adminChatId });
    return res.status(500).json({ error: "Feedback service not configured" });
  }

  const text = `<b>Smart Creator Feedback Received</b>\n\n` +
    `<b>Session ID :</b> <code>${sessionId}</code>\n` +
    `<b>Name :</b> <code>${name}</code> <b>Email/Telegram:</b> <code>${contact}</code>\n` +
    `<b>Message:</b>\n<code>${message}</code>`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: text,
        parse_mode: "HTML",
      }),
    });

    if (response.ok) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to send feedback" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

import path from "path";

app.post(["/api/login", "/login"], async (req, res) => {
  const id = req.body.id?.toString().trim();
  const password = req.body.password?.toString().trim();

  if (!id || !password) {
    return res.status(400).json({ error: "ID and Password are required" });
  }

  // Check if session is banned
  if (supabase) {
    const { data: banData } = await supabase.from('banned_sessions').select('id').eq('session_id', id).single();
    if (banData) {
      return res.status(403).json({ error: "This ID has been banned." });
    }
  }

  let i = 1;
  let foundKey = null;

  while (i <= 10) {
    const envId = process.env[`SYSTEM_KEY_${i}_ID`];
    const envPass = process.env[`SYSTEM_KEY_${i}_PASS`];
    const envValue = process.env[`SYSTEM_KEY_${i}_VALUE`];

    if (!envId) break;

    if (envId === id && envPass === password) {
      foundKey = envValue;
      break;
    }
    i++;
  }

  if (foundKey) {
    return res.json({ apiKey: foundKey });
  } else {
    return res.status(401).json({ error: "Invalid ID or Password" });
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupVite();

// Export for Vercel
export default app;

// Local listen
const PORT = Number(process.env.PORT) || 3000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

