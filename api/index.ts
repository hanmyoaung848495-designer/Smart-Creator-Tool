import express from "express";
import path from "path";
import TelegramBot from "node-telegram-bot-api";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

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

  bot.onText(/\/start/, (msg) => {
    bot?.sendMessage(msg.chat.id, "👋 Welcome! Use /help to see commands.");
  });

  bot.onText(/\/help/, (msg) => {
    const currentId = String(msg.chat.id);
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
    if (String(msg.chat.id) !== String(adminChatId).trim()) {
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

    const toolCounts: Record<string, number> = {};
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
    if (String(msg.chat.id) !== String(adminChatId).trim()) {
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
    if (String(msg.chat.id) !== String(adminChatId).trim()) {
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
    if (String(msg.chat.id) !== String(adminChatId).trim()) {
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
    if (String(msg.chat.id) !== String(adminChatId).trim()) {
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

    // First clear existing
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
    if (String(msg.chat.id) !== String(adminChatId).trim()) {
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
    if (String(msg.chat.id) !== String(adminChatId).trim()) {
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
app.use((req, res, next) => {
  console.log(`[Server] ${req.method} ${req.url}`);
  next();
});

app.get("/api/telegram-webhook", (req, res) => {
  res.send("🤖 Telegram Bot Webhook is active. Please send a POST request.");
});

app.post(["/api/telegram-webhook", "/telegram-webhook"], (req, res) => {
  console.log(`[Webhook] Received update: ${JSON.stringify(req.body)}`);
  if (bot) {
    try {
      bot.processUpdate(req.body);
      res.status(200).send("OK");
    } catch (err) {
      console.error("[Webhook] Error processing update:", err);
      res.status(500).send("Error processing update");
    }
  } else {
    console.error("[Webhook] Bot not initialized");
    res.status(500).send("Bot not initialized");
  }
});

app.post(["/api/feedback", "/feedback"], async (req, res) => {
  const { name, contact, message } = req.body;

  if (!name || !contact || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (!botToken || !adminChatId) {
    console.error("Telegram credentials missing in environment variables");
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
        chat_id: adminChatId,
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
});

app.post(["/api/login", "/login"], (req, res) => {
  const id = req.body.id?.toString().trim();
  const password = req.body.password?.toString().trim();

  if (!id || !password) {
    return res.status(400).json({ error: "ID and Password are required" });
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
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

