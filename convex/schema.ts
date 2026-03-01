import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  agent_actions_log: defineTable({
    actorId: v.string(),
    actionType: v.string(),
    targetId: v.optional(v.string()),
    details: v.optional(v.string()),
    status: v.string(),
    createdAt: v.number(),
  }),
  
  chat_conversations: defineTable({
    userId: v.string(),
    key: v.string(),
    title: v.optional(v.string()),
    pinned: v.boolean(),
    openclawSessionKey: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_key", ["userId", "key"]),
  
  chat_messages: defineTable({
    userId: v.string(),
    conversationKey: v.string(),
    sender: v.union(v.literal("user"), v.literal("agent")),
    content: v.string(),
    ts: v.number(),
    modelId: v.optional(v.string()),
    usageLabel: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user_conv_ts", ["userId", "conversationKey", "ts"]),
});
