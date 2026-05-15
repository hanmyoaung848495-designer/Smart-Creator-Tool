// Fixes for node-telegram-bot-api in serverless environments
process.env.NTBA_FIX_319 = "1";
process.env.NTBA_FIX_350 = "1";

import express from "express";
import { botService } from '../services/botService.js';
import TelegramBot from "node-telegram-bot-api";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Initialize Telegram Bot
const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID;
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

  bot.onText(/\/users/, async (msg) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    await botService.handleListUsers(bot, msg.chat.id);
  });

  bot.onText(/\/adduser\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const input = match?.[1];
    if (!input) return;
    await botService.handleAddUserBot(bot, msg.chat.id, input);
  });

  bot.onText(/\/checkuser\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const id = match?.[1]?.trim();
    if (!id) return;
    await botService.handleCheckUserBot(bot, msg.chat.id, id);
  });

  bot.onText(/\/deluser\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const id = match?.[1]?.trim();
    if (!id) return;
    await botService.handleDeleteUserBot(bot, msg.chat.id, id);
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

app.post(/^\/(api\/)?(telegram-)?webhook$/, (req, res) => {
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

app.post(/^\/(api\/)?feedback$/, async (req, res) => {
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
import ytdl from "@distube/ytdl-core";
import { GoogleGenAI } from "@google/genai";

function extractVideoId(url: string) {
  // Enhanced regex to handle watch?v=, youtu.be/, shorts/, embed/, etc.
  const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[1] && match[1].length === 11) ? match[1] : null;
}

app.post(/^\/(api\/)?youtube-transcribe$/, async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    console.log(`[YouTube Transcribe] Processing URL: ${url}`);
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL. Could not extract Video ID.");
    }

    const transcriptApiKey = process.env.TRANSCRIPT_API_KEY;
    if (!transcriptApiKey) {
      throw new Error("TRANSCRIPT_API_KEY is not configured on the server.");
    }

    // Call TranscriptAPI.com - V2 Endpoint as per PDF
    const response = await fetch(`https://transcriptapi.com/api/v2/youtube/transcript?video_url=${encodeURIComponent(url)}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${transcriptApiKey}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Forward the exact status code so frontend can handle it
      return res.status(response.status).json({
        error: errorData.error || `TranscriptAPI failed with status ${response.status}`,
        detail: errorData.detail || errorData.error
      });
    }

    const data = await response.json();
    console.log(`[YouTube Transcribe] Success using TranscriptAPI V2.`);

    // Handle V2 response which might return segments or a single string
    let transcribedText = "";
    if (Array.isArray(data.transcript)) {
      transcribedText = data.transcript.map((segment: any) => segment.text).join(" ");
    } else if (data.transcript && typeof data.transcript === "string") {
      transcribedText = data.transcript;
    } else if (data.text) {
      transcribedText = typeof data.text === "string" ? data.text : JSON.stringify(data.text);
    } else {
      transcribedText = "No transcript found for this video.";
    }

    return res.json({
      text: transcribedText,
      sources: []
    });

  } catch (error: any) {
    console.error("[YouTube Transcribe] Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process YouTube video" });
  }
});

app.post(/^\/(api\/)?kc-tts\/generate$/, async (req, res) => {
  try {
    const appUrl = process.env.APP_URL; // e.g., Hugging Face Space URL
    const apiKey = process.env.TTS_API_KEY;

    if (!appUrl) {
      return res.status(500).json({ error: "APP_URL is not configured" });
    }

    const apiUrl = `${appUrl}/generate`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey || ""
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    
    // Prefix relative URLs with APP_URL
    if (data.audio_url && data.audio_url.startsWith('/')) {
      data.audio_url = `${appUrl}${data.audio_url}`;
    }
    if (data.srt_url && data.srt_url.startsWith('/')) {
      data.srt_url = `${appUrl}${data.srt_url}`;
    }

    return res.json(data);
  } catch (error) {
    console.error("KC TTS Proxy Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post(/^\/(api\/)?login$/, async (req, res) => {
  const id = req.body.id?.toString().trim();
  const password = req.body.password?.toString().trim();
  const deviceId = req.body.deviceId?.toString().trim();

  if (!id || !password) {
    return res.status(400).json({ error: "ID and Password are required" });
  }

  // 1. Check fixed environment variables (Super Admin)
  let i = 1;
  let isSystemAdmin = false;
  let foundSuperKey = "";
  
  while (i <= 10) {
    const envId = process.env[`SYSTEM_KEY_${i}_ID`];
    const envPass = process.env[`SYSTEM_KEY_${i}_PASS`];
    const envValue = process.env[`SYSTEM_KEY_${i}_VALUE`] || process.env.GEMINI_API_KEY || "";
    if (!envId) break;
    if (envId === id && envPass === password) {
      isSystemAdmin = true;
      foundSuperKey = envValue;
      break;
    }
    i++;
  }

  if (isSystemAdmin) {
    return res.json({ apiKey: foundSuperKey, role: 'admin' });
  }

  // 2. Check Supabase for user account
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });

  try {
    const { data: userData, error } = await supabase
      .from('users_accounts')
      .select('*')
      .eq('username', id)
      .eq('password', password)
      .single();

    if (error || !userData) {
      return res.status(401).json({ error: "Invalid ID or Password" });
    }

    // Check expiration
    if (!userData.is_lifetime && userData.expired_date) {
      if (Date.now() > userData.expired_date) {
        return res.status(403).json({ error: "Account has expired. Please contact admin." });
      }
    }

    // Check start date
    if (userData.start_date && Date.now() < userData.start_date) {
      return res.status(403).json({ error: "Account is not active yet." });
    }

    // Check device binding
    if (userData.device_id && deviceId && userData.device_id !== deviceId) {
      return res.status(403).json({ error: "This ID is bound to another device." });
    }

    // Update device ID if not set
    const updates: any = { last_login: Date.now() };
    if (!userData.device_id && deviceId) {
      updates.device_id = deviceId;
    }

    await supabase
      .from('users_accounts')
      .update(updates)
      .eq('id', userData.id);

    // For regular users, we return a system key if set, or just success
    const systemApiKey = process.env.SYSTEM_KEY_1_VALUE || ''; 
    return res.json({ 
      apiKey: systemApiKey, 
      role: userData.role || 'premium',
      user: {
        name: userData.name,
        username: userData.username,
        role: userData.role
      }
    });

  } catch (error) {
    console.error("Login Check Error:", error);
    return res.status(500).json({ error: "Internal server error during login" });
  }
});

// Admin API Routes
app.get("/api/admin/users", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });

  try {
    const { data, error } = await supabase
      .from('users_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post("/api/admin/users", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });

  try {
    const account = req.body;
    // Map camalCase to snake_case for Supabase
    const supabaseData = {
      name: account.name,
      username: account.username,
      password: account.password,
      role: account.role,
      start_date: account.startDate,
      expired_date: account.expiredDate,
      is_lifetime: account.isLifetime,
      telegram: account.telegram,
      device_id: account.deviceId,
      created_at: Date.now()
    };

    const { error } = await supabase
      .from('users_accounts')
      .upsert(supabaseData, { onConflict: 'username' });

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Add User Error:", error);
    res.status(500).json({ error: "Failed to add user" });
  }
});

app.delete("/api/admin/users/:username", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });

  try {
    const { error } = await supabase
      .from('users_accounts')
      .delete()
      .eq('username', req.params.username);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Tutorials Admin API
app.get("/api/admin/tutorials", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const { data, error } = await supabase
      .from('tutorials')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tutorials" });
  }
});

app.post("/api/admin/tutorials", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const tutorial = req.body;
    let error;
    if (tutorial.id) {
      // Update
      const { error: err } = await supabase
        .from('tutorials')
        .update({
          title: tutorial.title,
          video_id: tutorial.video_id,
          time_start: tutorial.time_start,
          content: tutorial.content,
          tool_key: tutorial.tool_key
        })
        .eq('id', tutorial.id);
      error = err;
    } else {
      // Insert
      const { error: err } = await supabase
        .from('tutorials')
        .insert([{
          title: tutorial.title,
          video_id: tutorial.video_id,
          time_start: tutorial.time_start,
          content: tutorial.content,
          tool_key: tutorial.tool_key
        }]);
      error = err;
    }
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Save Tutorial Error:", error);
    res.status(500).json({ error: "Failed to save tutorial" });
  }
});

app.delete("/api/admin/tutorials/:id", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const { error } = await supabase
      .from('tutorials')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete tutorial" });
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
    app.get(/.*/, (req, res) => {
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

