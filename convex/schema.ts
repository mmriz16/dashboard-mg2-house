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
});
