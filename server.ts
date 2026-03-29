import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import TelegramBot from "node-telegram-bot-api";
import { createClient } from "@supabase/supabase-js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ===== Supabase =====
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabase =
    supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey)
      : null;

  // ===== Telegram Bot =====
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_CHAT_ID;

  let bot: TelegramBot | null = null;

  if (botToken) {
    bot = new TelegramBot(botToken, { polling: false });
    console.log("✅ Telegram bot initialized (webhook mode)");

    // ===== DEBUG =====
    bot.on("message", (msg) => {
      console.log(`📩 ${msg.chat.id}: ${msg.text}`);
    });

    // ===== COMMANDS =====
    bot.onText(/\/start/, (msg) => {
      bot?.sendMessage(msg.chat.id, "👋 Welcome! Use /help");
    });

    bot.onText(/\/help/, (msg) => {
      if (String(msg.chat.id) !== String(adminChatId).trim()) {
        return bot?.sendMessage(
          msg.chat.id,
          `⚠️ Unauthorized. Your ID: ${msg.chat.id}`
        );
      }

      bot?.sendMessage(
        msg.chat.id,
        `🤖 Commands:

/stats - Today stats
/stats all
/stats YYYY-MM-DD

/post Title | VideoId | Time | Content | tool
/listposts
/delpost id

/playlist Video | Time ...
/listplaylist
/delplaylist`,
        { parse_mode: "Markdown" }
      );
    });

    // ===== STATS =====
    bot.onText(/\/stats(?:\s+(.*))?/, async (msg, match) => {
      if (String(msg.chat.id) !== String(adminChatId).trim()) {
        return bot?.sendMessage(msg.chat.id, "⚠️ Unauthorized");
      }
      if (!supabase) {
        return bot?.sendMessage(msg.chat.id, "Supabase not configured");
      }

      const param = match?.[1]?.trim();
      let query = supabase.from("analytics").select("tool", { count: "exact" });

      let label = "Today";

      if (param === "all") {
        label = "All Time";
      } else if (param) {
        label = param;
        query = query.like("timestamp", `${param}%`);
      } else {
        const today = new Date().toISOString().split("T")[0];
        query = query.like("timestamp", `${today}%`);
      }

      const { data, count, error } = await query;

      if (error) {
        return bot?.sendMessage(msg.chat.id, error.message);
      }

      const toolCounts: Record<string, number> = {};
      data?.forEach((r) => {
        toolCounts[r.tool] = (toolCounts[r.tool] || 0) + 1;
      });

      let text = `📊 Stats (${label})\nTotal: ${count}\n\n`;
      for (const [k, v] of Object.entries(toolCounts)) {
        text += `- ${k}: ${v}\n`;
      }

      bot?.sendMessage(msg.chat.id, text);
    });

    // ===== POST =====
    bot.onText(/\/post\s+(.*)/, async (msg, match) => {
      if (String(msg.chat.id) !== String(adminChatId).trim()) {
        return bot?.sendMessage(msg.chat.id, "⚠️ Unauthorized");
      }
      if (!supabase) return;

      const parts = match?.[1]?.split("|").map((p) => p.trim());
      if (!parts || parts.length < 4) {
        return bot?.sendMessage(msg.chat.id, "Invalid format");
      }

      const [title, video_id, time_start, content, tool_key] = parts;

      const { error } = await supabase.from("tutorials").insert([
        {
          title,
          video_id,
          time_start,
          content,
          tool_key: tool_key || null,
        },
      ]);

      bot?.sendMessage(
        msg.chat.id,
        error ? error.message : "✅ Added"
      );
    });

    // ===== LIST POSTS =====
    bot.onText(/\/listposts/, async (msg) => {
      if (String(msg.chat.id) !== String(adminChatId).trim()) {
        return bot?.sendMessage(msg.chat.id, "⚠️ Unauthorized");
      }
      if (!supabase) return;

      const { data } = await supabase
        .from("tutorials")
        .select("id,title");

      if (!data?.length) {
        return bot?.sendMessage(msg.chat.id, "No posts");
      }

      let text = "📚 Tutorials\n\n";
      data.forEach((t) => {
        text += `${t.id} - ${t.title}\n`;
      });

      bot?.sendMessage(msg.chat.id, text);
    });

    // ===== DELETE POST =====
    bot.onText(/\/delpost\s+(.*)/, async (msg, match) => {
      if (String(msg.chat.id) !== String(adminChatId).trim()) {
        return bot?.sendMessage(msg.chat.id, "⚠️ Unauthorized");
      }
      if (!supabase) return;

      const id = match?.[1];

      await supabase.from("tutorials").delete().eq("id", id);

      bot?.sendMessage(msg.chat.id, "✅ Deleted");
    });

    // ===== PLAYLIST =====
    bot.onText(/\/playlist\s+(.*)/, async (msg, match) => {
      if (String(msg.chat.id) !== String(adminChatId).trim()) {
        return bot?.sendMessage(msg.chat.id, "⚠️ Unauthorized");
      }
      if (!supabase) return;

      const parts = match?.[1]?.split("|").map((p) => p.trim());
      if (!parts || parts.length % 2 !== 0) {
        return bot?.sendMessage(msg.chat.id, "Invalid format");
      }

      await supabase.from("playlists").delete().neq("id", 0);

      const inserts = [];
      for (let i = 0; i < parts.length; i += 2) {
        inserts.push({
          video_id: parts[i],
          time_start: Number(parts[i + 1]) || 0,
          order_index: i / 2,
        });
      }

      await supabase.from("playlists").insert(inserts);

      bot?.sendMessage(msg.chat.id, "✅ Playlist updated");
    });

    bot.onText(/\/listplaylist/, async (msg) => {
      if (String(msg.chat.id) !== String(adminChatId).trim()) {
        return bot?.sendMessage(msg.chat.id, "⚠️ Unauthorized");
      }
      if (!supabase) return;

      const { data } = await supabase
        .from("playlists")
        .select("*")
        .order("order_index");

      if (!data?.length) {
        return bot?.sendMessage(msg.chat.id, "Empty");
      }

      let text = "🎵 Playlist\n\n";
      data.forEach((p) => {
        text += `${p.order_index} - ${p.video_id}\n`;
      });

      bot?.sendMessage(msg.chat.id, text);
    });

    bot.onText(/\/delplaylist/, async (msg) => {
      if (String(msg.chat.id) !== String(adminChatId).trim()) {
        return bot?.sendMessage(msg.chat.id, "⚠️ Unauthorized");
      }
      if (!supabase) return;

      await supabase.from("playlists").delete().neq("id", 0);

      bot?.sendMessage(msg.chat.id, "✅ Cleared");
    });
  }

  // ===== 🔥 WEBHOOK =====
  app.post("/api/telegram-webhook", (req, res) => {
    console.log("🔥 Webhook hit");

    if (bot) {
      try {
        bot.processUpdate(req.body);
      } catch (err) {
        console.error("Webhook error:", err);
      }
    }

    res.sendStatus(200);
  });

  // ===== FEEDBACK =====
  app.post("/api/feedback", async (req, res) => {
    const { name, contact, message } = req.body;

    if (!name || !contact || !message) {
      return res.status(400).json({ error: "Missing fields" });
    }

    try {
      await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: adminChatId,
            text: `Feedback:\n${name}\n${contact}\n${message}`,
          }),
        }
      );

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // ===== LOGIN =====
  app.post("/api/login", (req, res) => {
    const { id, password } = req.body;

    let i = 1;
    while (true) {
      const envId = process.env[`SYSTEM_KEY_${i}_ID`];
      if (!envId) break;

      if (
        envId === id &&
        process.env[`SYSTEM_KEY_${i}_PASS`] === password
      ) {
        return res.json({
          apiKey: process.env[`SYSTEM_KEY_${i}_VALUE`],
        });
      }
      i++;
    }

    res.status(401).json({ error: "Invalid" });
  });

  // ===== VITE =====
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_, res) =>
      res.sendFile(path.join(distPath, "index.html"))
    );
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();
