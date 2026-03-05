/**
 * Sub-Agent Spawn Protocol
 * 
 * Handles spawning sub-agents (Builder, UI Guardian, QA Verifier) based on task complexity.
 * 
 * Spawn Threshold:
 * - >50 lines of code changes OR
 * - Multi-step tasks (backend + UI, or multiple files)
 * 
 * Role Configuration:
 * - Builder: qwen3-coder-plus, 15min SLA, backend + basic UI
 * - UI Guardian: qwen3.5-plus, 10min SLA, design polish + accessibility
 * - QA Verifier: qwen3.5-plus/glm-5, 10min SLA, final validation
 */

export type SubAgentRole = "builder" | "ui-guardian" | "qa-verifier";

export interface SpawnConfig {
  role: SubAgentRole;
  taskId: string;
  taskTitle: string;
  taskDetail: string;
  contextFiles?: string[]; // paths to attach
  timeoutSeconds?: number;
  model?: string;
}

export interface SpawnResult {
  sessionId: string;
  status: "spawned" | "failed";
  role: SubAgentRole;
  taskId: string;
  estimatedCompletionTime?: string; // ISO timestamp
  error?: string;
}

export interface HandoffData {
  filesChanged: string[];
  [key: string]: unknown;
}

// Role configurations
const ROLE_CONFIG: Record<SubAgentRole, { model: string; timeoutSeconds: number; fallbackModel?: string }> = {
  builder: {
    model: "qwen3-coder-plus",
    timeoutSeconds: 900, // 15 minutes
    fallbackModel: "qwen3-coder-next", // if rate limited
  },
  "ui-guardian": {
    model: "qwen3.5-plus",
    timeoutSeconds: 600, // 10 minutes
  },
  "qa-verifier": {
    model: "qwen3.5-plus",
    timeoutSeconds: 600, // 10 minutes
    fallbackModel: "glm-5",
  },
};

/**
 * Determine if a task should spawn a sub-agent based on complexity.
 * 
 * Threshold: >50 lines OR multi-step (inferred from task detail)
 */
export function shouldSpawnSubAgent(taskDetail: string, estimatedLines?: number): boolean {
  // If we have line estimate, use it
  if (estimatedLines !== undefined && estimatedLines > 50) {
    return true;
  }

  // Multi-step indicators in task detail
  const multiStepIndicators = [
    /\(1\).*\(2\)/, // numbered steps
    /todo:.*\(/i,
    /implement.*:/i,
    /create.*and.*/i,
    /add.*then.*/i,
  ];

  return multiStepIndicators.some((pattern) => pattern.test(taskDetail));
}

/**
 * Select the appropriate sub-agent role based on task type.
 */
export function selectRoleForTask(taskDetail: string): SubAgentRole {
  const detail = taskDetail.toLowerCase();

  // QA tasks (validation, testing, verification)
  if (detail.includes("test") || detail.includes("validate") || detail.includes("verify") || detail.includes("qa")) {
    return "qa-verifier";
  }

  // UI tasks (design, styling, accessibility, responsive)
  if (
    detail.includes("ui") ||
    detail.includes("design") ||
    detail.includes("styling") ||
    detail.includes("accessibility") ||
    detail.includes("responsive") ||
    detail.includes("css") ||
    detail.includes("tailwind")
  ) {
    return "ui-guardian";
  }

  // Default to builder for backend/API/database/core logic
  return "builder";
}

/**
 * Build spawn task description with context.
 */
export function buildSpawnTask(config: SpawnConfig): string {
  const roleConfig = ROLE_CONFIG[config.role];
  const roleNames: Record<SubAgentRole, string> = {
    builder: "Builder",
    "ui-guardian": "UI Guardian",
    "qa-verifier": "QA Verifier",
  };

  let task = `# ${roleNames[config.role]} Task\n\n`;
  task += `**Task ID:** ${config.taskId}\n`;
  task += `**Title:** ${config.taskTitle}\n\n`;
  task += `## Requirements\n\n${config.taskDetail}\n\n`;

  if (config.contextFiles && config.contextFiles.length > 0) {
    task += `## Context Files\n\nAttached:\n`;
    config.contextFiles.forEach((file) => {
      task += `- ${file}\n`;
    });
    task += "\n";
  }

  task += `## Output Format\n\n`;
  task += `When complete, provide a JSON summary:\n`;
  task += `\`\`\`json\n`;
  task += `{ "filesChanged": [], "status": "complete" }\n`;
  task += `\`\`\`\n\n`;

  task += `## Constraints\n\n`;
  task += `- Time limit: ${roleConfig.timeoutSeconds / 60} minutes\n`;
  task += `- Model: ${roleConfig.model}\n`;
  task += `- Stay within task scope\n`;
  task += `- Ask if uncertain about requirements\n`;

  return task;
}

/**
 * Generate sessions_spawn parameters for a sub-agent.
 */
export function buildSpawnParams(config: SpawnConfig): Record<string, unknown> {
  const roleConfig = ROLE_CONFIG[config.role];
  const taskDescription = buildSpawnTask(config);

  const params: Record<string, unknown> = {
    task: taskDescription,
    runtime: "subagent",
    mode: "run",
    timeoutSeconds: config.timeoutSeconds ?? roleConfig.timeoutSeconds,
    model: config.model ?? roleConfig.model,
    cleanup: "keep", // keep session for audit
    thinking: "on",
  };

  // Add label for tracking
  params.label = `${config.role}-${config.taskId}`;

  // Add context files as attachments if provided
  if (config.contextFiles && config.contextFiles.length > 0) {
    // Note: attachments would need file content loaded separately
    // This is a placeholder for the attachAs mechanism
    params.attachAs = {
      mountPath: "/context",
    };
  }

  return params;
}

/**
 * Parse handoff JSON from sub-agent output.
 */
export function parseHandoff(output: string): HandoffData | null {
  try {
    // Try to extract JSON from output
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.filesChanged || !Array.isArray(parsed.filesChanged)) {
      return null;
    }

    return parsed as HandoffData;
  } catch {
    return null;
  }
}

/**
 * Get fallback model for a role if primary is rate limited.
 */
export function getFallbackModel(role: SubAgentRole): string | undefined {
  return ROLE_CONFIG[role].fallbackModel;
}

/**
 * Estimate completion time for a spawn.
 */
export function estimateCompletionTime(timeoutSeconds: number): string {
  const now = new Date();
  const completion = new Date(now.getTime() + timeoutSeconds * 1000);
  return completion.toISOString();
}
