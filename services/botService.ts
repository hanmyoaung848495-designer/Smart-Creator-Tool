import { dbService } from './dbService';
import TelegramBot from 'node-telegram-bot-api';

export const botService = {
  async handleStart(bot: TelegramBot, chatId: number) {
    bot.sendMessage(chatId, "👋 Welcome! Use /help to see commands.");
  },

  async handleHelp(bot: TelegramBot, chatId: number, adminChatId: string) {
    const currentId = String(chatId);
    if (currentId !== String(adminChatId).trim()) {
      bot.sendMessage(chatId, `⚠️ Unauthorized. Your ID is: ${currentId}.`);
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
/listposts - List all tutorial videos
/delpost [id] - Delete a tutorial by ID
/checkpost [id] - Check details of a tutorial by ID

🎵 *Playlists:*
/playlist Video1Id | Time1 | Video2Id | Time2 | ... - Set the header video playlist
/listplaylist - List current playlist videos
/delplaylist - Clear the playlist

🚫 *Ban Management:*
/ban [session_id] - Ban a session ID
/unban [session_id] - Unban a session ID
/listbans - List all banned session IDs
/checkban [session_id] - Check if a session ID is banned

⚙️ *System:*
/setwebhook - Set/Reset the bot webhook URL
    `;
    bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
  },

  async handleStats(bot: TelegramBot, chatId: number, param: string | undefined) {
    const { data, count, error } = await dbService.getStats(param);
    if (error) {
      bot.sendMessage(chatId, `❌ Error fetching stats: ${error.message}`);
      return;
    }

    const toolCounts: Record<string, number> = {};
    data?.forEach(row => {
      toolCounts[row.tool] = (toolCounts[row.tool] || 0) + 1;
    });

    let statsText = `📊 *Stats for ${param || "Today"}*\n\nTotal Interactions: ${count}\n\n*Tool Usage:*\n`;
    for (const [tool, c] of Object.entries(toolCounts)) {
      statsText += `- ${tool}: ${c}\n`;
    }
    bot.sendMessage(chatId, statsText, { parse_mode: "Markdown" });
  },

  async handlePost(bot: TelegramBot, chatId: number, input: string) {
    const parts = input.split('|').map(p => p.trim());
    if (parts.length < 4) {
      bot.sendMessage(chatId, "Invalid format. Use: /post Title | Video Id | Time start | content | [tool_key]");
      return;
    }
    const [title, video_id, time_start, content, tool_key] = parts;
    const { error } = await dbService.addTutorial(title, video_id, parseInt(time_start), content, tool_key || null);
    if (error) {
      bot.sendMessage(chatId, `❌ Error adding tutorial: ${error.message}`);
    } else {
      bot.sendMessage(chatId, "✅ Tutorial added successfully.");
    }
  },

  async handleListPosts(bot: TelegramBot, chatId: number) {
    const { data, error } = await dbService.listTutorials();
    if (error) {
      bot.sendMessage(chatId, `❌ Error fetching tutorials: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      bot.sendMessage(chatId, "No tutorials found.");
      return;
    }
    let listText = "📚 *Tutorial List:*\n\n";
    data.forEach(t => {
      listText += `🆔 \`${t.id}\` | *${t.title}* ${t.tool_key ? `(\`${t.tool_key}\`)` : ""}\n`;
    });
    bot.sendMessage(chatId, listText, { parse_mode: "Markdown" });
  },

  async handleCheckPost(bot: TelegramBot, chatId: number, id: string) {
    const { data, error } = await dbService.getTutorial(id);
    if (error || !data) {
      bot.sendMessage(chatId, `❌ Error fetching tutorial: ${error?.message || "Not found"}`);
      return;
    }
    const checkText = `
📚 *Tutorial Details:*
🆔 \`${data.id}\`
📌 *Title:* ${data.title}
🎥 *Video ID:* \`${data.video_id}\`
⏱️ *Start Time:* ${data.time_start}s
🛠️ *Tool Key:* \`${data.tool_key || "None"}\`
📝 *Content:*
${data.content}
    `;
    bot.sendMessage(chatId, checkText, { parse_mode: "Markdown" });
  },

  async handleDeletePost(bot: TelegramBot, chatId: number, id: string) {
    const { error } = await dbService.deleteTutorial(id);
    if (error) {
      bot.sendMessage(chatId, `❌ Error deleting tutorial: ${error.message}`);
    } else {
      bot.sendMessage(chatId, `✅ Tutorial ${id} deleted.`);
    }
  },

  async handlePlaylist(bot: TelegramBot, chatId: number, input: string) {
    const parts = input.split('|').map(p => p.trim());
    if (parts.length % 2 !== 0) {
      bot.sendMessage(chatId, "Invalid format. Must be pairs of Video ID and Time start.");
      return;
    }
    const inserts = [];
    for (let i = 0; i < parts.length; i += 2) {
      inserts.push({
        video_id: parts[i],
        time_start: parseInt(parts[i+1]) || 0,
        order_index: i / 2
      });
    }
    const { error } = await dbService.setPlaylist(inserts);
    if (error) {
      bot.sendMessage(chatId, `❌ Error setting playlist: ${error.message}`);
    } else {
      bot.sendMessage(chatId, `✅ Playlist updated with ${inserts.length} videos.`);
    }
  },

  async handleListPlaylist(bot: TelegramBot, chatId: number) {
    const { data, error } = await dbService.listPlaylist();
    if (error) {
      bot.sendMessage(chatId, `❌ Error fetching playlist: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      bot.sendMessage(chatId, "Playlist is empty.");
      return;
    }
    let listText = "🎵 *Current Playlist:*\n\n";
    data.forEach(p => {
      listText += `🔹 Order: ${p.order_index} | Video ID: \`${p.video_id}\`\n`;
    });
    bot.sendMessage(chatId, listText, { parse_mode: "Markdown" });
  },

  async handleDelPlaylist(bot: TelegramBot, chatId: number) {
    const { error } = await dbService.clearPlaylist();
    if (error) {
      bot.sendMessage(chatId, `❌ Error clearing playlist: ${error.message}`);
    } else {
      bot.sendMessage(chatId, "✅ Playlist cleared.");
    }
  },

  async handleBan(bot: TelegramBot, chatId: number, sessionId: string) {
    const { error } = await dbService.banSession(sessionId);
    if (error) {
      bot.sendMessage(chatId, `❌ Error banning session: ${error.message}`);
    } else {
      bot.sendMessage(chatId, `✅ Session ID \`${sessionId}\` has been banned.`);
    }
  },

  async handleUnban(bot: TelegramBot, chatId: number, sessionId: string) {
    const { error } = await dbService.unbanSession(sessionId);
    if (error) {
      bot.sendMessage(chatId, `❌ Error unbanning session: ${error.message}`);
    } else {
      bot.sendMessage(chatId, `✅ Session ID \`${sessionId}\` has been unbanned.`);
    }
  },

  async handleListBans(bot: TelegramBot, chatId: number) {
    const { data, error } = await dbService.listBannedSessions();
    if (error) {
      bot.sendMessage(chatId, `❌ Error fetching bans: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      bot.sendMessage(chatId, "No banned sessions.");
      return;
    }
    let listText = "🚫 *Banned Sessions:*\n\n";
    data.forEach(b => {
      listText += `- \`${b.session_id}\` (since ${new Date(b.created_at).toLocaleDateString()})\n`;
    });
    bot.sendMessage(chatId, listText, { parse_mode: "Markdown" });
  },

  async handleCheckBan(bot: TelegramBot, chatId: number, sessionId: string) {
    const { data, error } = await dbService.checkBan(sessionId);
    if (error && error.code !== 'PGRST116') {
      bot.sendMessage(chatId, `❌ Error checking ban: ${error.message}`);
    } else if (data) {
      bot.sendMessage(chatId, `🚫 Session ID \`${sessionId}\` is BANNED.`);
    } else {
      bot.sendMessage(chatId, `✅ Session ID \`${sessionId}\` is NOT banned.`);
    }
  }
};
