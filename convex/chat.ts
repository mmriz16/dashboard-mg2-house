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
