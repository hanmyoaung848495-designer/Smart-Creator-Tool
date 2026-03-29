import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
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
let bot = null;

if (botToken) {
  bot = new TelegramBot(botToken, { polling: false });
  console.log("Telegram bot initialized (Webhook mode).");

  bot.on("message", (msg) => {
    console.log(`[Bot] Message from ${msg.chat.id}: ${msg.text}`);
  });

  bot.onText(/\/start/, (msg) => {
    bot?.sendMessage(msg.chat.id, "👋 Welcome! Use /help to see commands.");
  });

  bot.onText(/\/help/, (msg) => {
    const currentId = String(msg.chat.id).trim();
    const expectedId = String(adminChatId).trim();
    
    if (currentId !== expectedId) {
      bot?.sendMessage(msg.chat.id, `⚠️ Unauthorized. Your ID is: ${currentId}. Please update your Environment Variables if this is you.`);
      return;
    }
    const helpText = `
🤖 *Smart Creator Tools Bot*

📊 *Analytics:*
/stats - Today's visitors
/stats all - All time visitors
/stats YYYY-MM-DD - Visitors on a specific date

📚 *Tutorials:*
/post Title | Video Id | Time start | content | [tool_key] - Add a new tutorial
💡 *Tool Keys:* transcribe, srt_generator, srt_translate, text_to_srt, script_writer, translator, teleprompter, ai_voice, api_key

/listposts - List all tutorial videos
/delpost [id] - Delete a tutorial by ID

🎵 *Playlists:*
/playlist Video1Id | Time1 | Video2Id | Time2 | ... - Set the header video playlist
/listplaylist - List current playlist videos
/delplaylist - Clear the playlist
    `;
    bot?.sendMessage(msg.chat.id, helpText, { parse_mode: "Markdown" });
  });

  bot.onText(/\/stats(?:\s+(.*))?/, async (msg, match) => {
    if (String(msg.chat.id).trim() !== String(adminChatId).trim()) {
      bot?.sendMessage(msg.chat.id, "⚠️ Unauthorized.");
      return;
    }
    if (!supabase) {
      bot?.sendMessage(msg.chat.id, "Supabase is not configured.");
      return;
    }

    const param = match?.[1]?.trim();
    let query = supabase.from('analytics').select('tool', { count: 'exact' });

    let dateStr = "Today";
    if (param === 'all') {
      dateStr = "All Time";
    } else if (param) {
      dateStr = param;
      query = query.like('timestamp', `${param}%`);
    } else {
      const today = new Date().toISOString().split('T')[0];
      query = query.like('timestamp', `${today}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      bot?.sendMessage(msg.chat.id, `Error fetching stats: ${error.message}`);
      return;
    }

    const toolCounts = {};
    data?.forEach(row => {
      toolCounts[row.tool] = (toolCounts[row.tool] || 0) + 1;
    });

    let statsText = `📊 *Stats for ${dateStr}*\n\nTotal Interactions: ${count}\n\n*Tool Usage:*\n`;
    for (const [tool, c] of Object.entries(toolCounts)) {
      statsText += `- ${tool}: ${c}\n`;
    }

    bot?.sendMessage(msg.chat.id, statsText, { parse_mode: "Markdown" });
  });

  bot.onText(/\/post\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id).trim() !== String(adminChatId).trim()) {
      bot?.sendMessage(msg.chat.id, "⚠️ Unauthorized.");
      return;
    }
    if (!supabase) return;

    const input = match?.[1];
    if (!input) return;

    const parts = input.split('|').map(p => p.trim());
    if (parts.length < 4) {
      bot?.sendMessage(msg.chat.id, "Invalid format. Use: /post Title | Video Id | Time start | content | [tool_key]");
      return;
    }

    const [title, video_id, time_start, content, tool_key] = parts;

    const { error } = await supabase.from('tutorials').insert([{
      title, video_id, time_start, content, tool_key: tool_key || null
    }]);

    if (error) {
      bot?.sendMessage(msg.chat.id, `Error adding tutorial: ${error.message}`);
    } else {
      bot?.sendMessage(msg.chat.id, "✅ Tutorial added successfully.");
    }
  });

  bot.onText(/\/listposts/, async (msg) => {
    if (String(msg.chat.id).trim() !== String(adminChatId).trim()) {
      bot?.sendMessage(msg.chat.id, "⚠️ Unauthorized.");
      return;
    }
    if (!supabase) return;

    const { data, error } = await supabase
      .from('tutorials')
      .select('id, title, tool_key')
      .order('id', { ascending: true });

    if (error) {
      bot?.sendMessage(msg.chat.id, `Error fetching tutorials: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      bot?.sendMessage(msg.chat.id, "No tutorials found.");
      return;
    }

    let listText = "📚 *Tutorial List:*\n\n";
    data.forEach(t => {
      listText += `🆔 \`${t.id}\` | *${t.title}* ${t.tool_key ? `(\`${t.tool_key}\`)` : ""}\n`;
    });

    bot?.sendMessage(msg.chat.id, listText, { parse_mode: "Markdown" });
  });

  bot.onText(/\/delpost\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id).trim() !== String(adminChatId).trim()) {
      bot?.sendMessage(msg.chat.id, "⚠️ Unauthorized.");
      return;
    }
    if (!supabase) return;

    const id = match?.[1]?.trim();
    if (!id) return;

    const { error } = await supabase.from('tutorials').delete().eq('id', id);

    if (error) {
      bot?.sendMessage(msg.chat.id, `Error deleting tutorial: ${error.message}`);
    } else {
      bot?.sendMessage(msg.chat.id, `✅ Tutorial ${id} deleted.`);
    }
  });

  bot.onText(/\/playlist\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id).trim() !== String(adminChatId).trim()) {
      bot?.sendMessage(msg.chat.id, "⚠️ Unauthorized.");
      return;
    }
    if (!supabase) return;

    const input = match?.[1];
    if (!input) return;

    const parts = input.split('|').map(p => p.trim());
    if (parts.length % 2 !== 0) {
      bot?.sendMessage(msg.chat.id, "Invalid format. Must be pairs of Video ID and Time start.");
      return;
    }

    await supabase.from('playlists').delete().neq('id', 0);

    const inserts = [];
    for (let i = 0; i < parts.length; i += 2) {
      inserts.push({
        video_id: parts[i],
        time_start: parseInt(parts[i+1]) || 0,
        order_index: i / 2
      });
    }

    const { error } = await supabase.from('playlists').insert(inserts);

    if (error) {
      bot?.sendMessage(msg.chat.id, `Error setting playlist: ${error.message}`);
    } else {
      bot?.sendMessage(msg.chat.id, `✅ Playlist updated with ${inserts.length} videos.`);
    }
  });

  bot.onText(/\/listplaylist/, async (msg) => {
    if (String(msg.chat.id).trim() !== String(adminChatId).trim()) {
      bot?.sendMessage(msg.chat.id, "⚠️ Unauthorized.");
      return;
    }
    if (!supabase) return;

    const { data, error } = await supabase
      .from('playlists')
      .select('id, video_id, order_index')
      .order('order_index', { ascending: true });

    if (error) {
      bot?.sendMessage(msg.chat.id, `Error fetching playlist: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      bot?.sendMessage(msg.chat.id, "Playlist is empty.");
      return;
    }

    let listText = "🎵 *Current Playlist:*\n\n";
    data.forEach(p => {
      listText += `🔹 Order: ${p.order_index} | Video ID: \`${p.video_id}\`\n`;
    });

    bot?.sendMessage(msg.chat.id, listText, { parse_mode: "Markdown" });
  });

  bot.onText(/\/delplaylist/, async (msg) => {
    if (String(msg.chat.id).trim() !== String(adminChatId).trim()) {
      bot?.sendMessage(msg.chat.id, "⚠️ Unauthorized.");
      return;
    }
    if (!supabase) return;

    const { error } = await supabase.from('playlists').delete().neq('id', 0);

    if (error) {
      bot?.sendMessage(msg.chat.id, `Error clearing playlist: ${error.message}`);
    } else {
      bot?.sendMessage(msg.chat.id, "✅ Playlist cleared.");
    }
  });
}

// API routes
app.post("/api/telegram-webhook", async (req, res) => {
  if (bot) {
    try {
      await bot.processUpdate(req.body);
    } catch (err) {
      console.error("Bot Error:", err);
    }
  }
  res.sendStatus(200);
});

app.post("/api/feedback", async (req, res) => {
  const { name, contact, message } = req.body;

  if (!name || !contact || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(500).json({ error: "Feedback service not configured" });
  }

  const text = `<b>New Feedback Received</b>\n\n` +
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
      res.status(500).json({ error: "Failed to send feedback" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/login", (req, res) => {
  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).json({ error: "ID and Password are required" });
  }

  let i = 1;
  let foundKey = null;

  while (true) {
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

// Vite middleware for development (Only runs in local)
if (process.env.NODE_ENV !== "production") {
  const startLocalServer = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.listen(3000, "0.0.0.0", () => {
      console.log(`Local Server running on http://localhost:3000`);
    });
  };
  startLocalServer();
}

// VERCEL FIX: Export the app instead of running app.listen in production
export default app;
