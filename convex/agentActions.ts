import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const logAction = mutation({
  args: {
    actorId: v.string(),
    actionType: v.string(),
    targetId: v.optional(v.string()),
    details: v.optional(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const { actorId, actionType, targetId, details, status } = args;
    await ctx.db.insert("agent_actions_log", {
      actorId,
      actionType,
      targetId,
      details,
      status,
      createdAt: Date.now(),
    });
  },
});
