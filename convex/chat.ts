import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Conversations
export const createConversation = mutation({
  args: {
    userId: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    openclawSessionKey: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("chat_conversations", {
      userId: args.userId,
      key: args.key,
      title: args.title,
      pinned: false,
      openclawSessionKey: args.openclawSessionKey,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const getConversations = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chat_conversations")
      .withIndex("by_user_key", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const updateConversation = mutation({
  args: {
    id: v.id("chat_conversations"),
    title: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      ...(args.title !== undefined && { title: args.title }),
      ...(args.pinned !== undefined && { pinned: args.pinned }),
      updatedAt: Date.now(),
    });
  },
});

// Messages
export const addMessage = mutation({
  args: {
    userId: v.string(),
    conversationKey: v.string(),
    sender: v.union(v.literal("user"), v.literal("agent")),
    content: v.string(),
    modelId: v.optional(v.string()),
    usageLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("chat_messages", {
      userId: args.userId,
      conversationKey: args.conversationKey,
      sender: args.sender,
      content: args.content,
      ts: now,
      modelId: args.modelId,
      usageLabel: args.usageLabel,
      createdAt: now,
    });

    // Update conversation updatedAt
    const conv = await ctx.db
      .query("chat_conversations")
      .withIndex("by_user_key", (q) =>
        q.eq("userId", args.userId).eq("key", args.conversationKey)
      )
      .first();
    if (conv) {
      await ctx.db.patch(conv._id, { updatedAt: now });
    }

    return id;
  },
});

export const getMessages = query({
  args: {
    userId: v.string(),
    conversationKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chat_messages")
      .withIndex("by_user_conv_ts", (q) =>
        q.eq("userId", args.userId).eq("conversationKey", args.conversationKey)
      )
      .collect();
  },
});

export const deleteConversation = mutation({
  args: {
    userId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    // Delete all messages
    const messages = await ctx.db
      .query("chat_messages")
      .withIndex("by_user_conv_ts", (q) =>
        q.eq("userId", args.userId).eq("conversationKey", args.key)
      )
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
    // Delete conversation
    const conv = await ctx.db
      .query("chat_conversations")
      .withIndex("by_user_key", (q) =>
        q.eq("userId", args.userId).eq("key", args.key)
      )
      .first();
    if (conv) {
      await ctx.db.delete(conv._id);
    }
  },
});

export const getSessionKey = mutation({
  args: {
    userId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db
      .query("chat_conversations")
      .withIndex("by_user_key", (q) =>
        q.eq("userId", args.userId).eq("key", args.key)
      )
      .first();
    if (conv) {
      return conv.openclawSessionKey;
    }
    // Create new conversation with generated session key
    const sessionKey = `hook:webchat:${crypto.randomUUID()}`;
    const now = Date.now();
    await ctx.db.insert("chat_conversations", {
      userId: args.userId,
      key: args.key,
      pinned: false,
      openclawSessionKey: sessionKey,
      createdAt: now,
      updatedAt: now,
    });
    return sessionKey;
  },
});

const STOP_WORDS = new Set([
  "yang", "dan", "atau", "dengan", "untuk", "dari", "ke", "di", "ini", "itu",
  "saya", "aku", "kamu", "kami", "kita", "the", "a", "an", "is", "are", "to",
  "of", "in", "on", "for", "please", "tolong", "bisa", "jadi", "buat", "agar",
  "nya", "ya", "ok", "oke",
]);

function summarizeConversation(contents: string[]): string {
  const joined = contents.join(" ").replace(/\s+/g, " ").trim();
  if (!joined) return "New Chat";

  const firstSentence = joined
    .split(/[.!?\n]/)
    .map((s) => s.trim())
    .find(Boolean);

  if (firstSentence) {
    const tokens = firstSentence
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9-]/g, ""))
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w.toLowerCase()))
      .slice(0, 3);
    if (tokens.length >= 2) {
      return tokens
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }
  }

  const words = joined.toLowerCase().match(/[a-zA-Z0-9]{3,}/g) || [];
  const freq = new Map<string, number>();
  for (const w of words) {
    if (STOP_WORDS.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  const top = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => w);
  if (top.length === 0) return "New Chat";
  return top.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export const addMessageWithTitle = mutation({
  args: {
    userId: v.string(),
    conversationKey: v.string(),
    sender: v.union(v.literal("user"), v.literal("agent")),
    content: v.string(),
    timestamp: v.number(),
    modelId: v.optional(v.string()),
    usageLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("chat_messages", {
      userId: args.userId,
      conversationKey: args.conversationKey,
      sender: args.sender,
      content: args.content,
      ts: args.timestamp,
      modelId: args.modelId,
      usageLabel: args.usageLabel,
      createdAt: now,
    });

    // Get recent messages for title generation
    const recent = await ctx.db
      .query("chat_messages")
      .withIndex("by_user_conv_ts", (q) =>
        q.eq("userId", args.userId).eq("conversationKey", args.conversationKey)
      )
      .order("desc")
      .take(30);

    const userMessages = recent.filter((m) => m.sender === "user");
    const source = userMessages.length > 0 ? userMessages : recent;
    const title = summarizeConversation(source.map((m) => m.content));

    // Update conversation title + updatedAt
    const conv = await ctx.db
      .query("chat_conversations")
      .withIndex("by_user_key", (q) =>
        q.eq("userId", args.userId).eq("key", args.conversationKey)
      )
      .first();
    if (conv) {
      await ctx.db.patch(conv._id, { title, updatedAt: now });
    }
  },
});
