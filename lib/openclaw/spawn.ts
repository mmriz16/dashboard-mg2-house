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

/**
 * Role-specific handoff formats for sub-agent pipeline.
 * Each handoff type has required fields for the next stage.
 */

// Builder → UI Guardian handoff
export interface BuilderHandoff {
  filesChanged: string[];
  logicComplete: boolean;
  testsPass: boolean;
  uiNote: string; // Notes for UI Guardian about what needs styling/polish
  buildErrors?: string[];
}

// UI Guardian → QA Verifier handoff
export interface UIHandoff {
  filesChanged: string[];
  designCompliant: boolean;
  responsive: boolean;
  accessibilityPass: boolean;
  changesApplied: string[]; // List of UI changes made
  visualNotes?: string;
}

// QA Verifier → Main Agent handoff
export interface QAHandoff {
  filesChanged: string[];
  scopeMatch: boolean;
  regressions: boolean; // true if regressions found
  edgeCasesHandled: boolean;
  readyForUser: boolean;
  issues?: string[]; // List of issues found (if any)
  testResults?: { passed: number; failed: number; skipped: number };
}

// Union type for any handoff
export type HandoffData = BuilderHandoff | UIHandoff | QAHandoff;

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
 * Validate handoff data based on role type.
 */
export function validateHandoff(handoff: HandoffData, fromRole: SubAgentRole): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!handoff.filesChanged || !Array.isArray(handoff.filesChanged)) {
    errors.push("filesChanged is required and must be an array");
  }

  if (fromRole === "builder") {
    const h = handoff as BuilderHandoff;
    if (typeof h.logicComplete !== "boolean") errors.push("logicComplete (boolean) is required");
    if (typeof h.testsPass !== "boolean") errors.push("testsPass (boolean) is required");
    if (typeof h.uiNote !== "string") errors.push("uiNote (string) is required");
  } else if (fromRole === "ui-guardian") {
    const h = handoff as UIHandoff;
    if (typeof h.designCompliant !== "boolean") errors.push("designCompliant (boolean) is required");
    if (typeof h.responsive !== "boolean") errors.push("responsive (boolean) is required");
    if (typeof h.accessibilityPass !== "boolean") errors.push("accessibilityPass (boolean) is required");
    if (!Array.isArray(h.changesApplied)) errors.push("changesApplied (array) is required");
  } else if (fromRole === "qa-verifier") {
    const h = handoff as QAHandoff;
    if (typeof h.scopeMatch !== "boolean") errors.push("scopeMatch (boolean) is required");
    if (typeof h.regressions !== "boolean") errors.push("regressions (boolean) is required");
    if (typeof h.edgeCasesHandled !== "boolean") errors.push("edgeCasesHandled (boolean) is required");
    if (typeof h.readyForUser !== "boolean") errors.push("readyForUser (boolean) is required");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Create a handoff comment for task history.
 */
export function createHandoffComment(
  taskId: string,
  fromRole: SubAgentRole,
  handoff: HandoffData,
  authorType: "main-agent" | "sub-agent" = "sub-agent",
): string {
  const roleNames: Record<SubAgentRole, string> = {
    builder: "Builder",
    "ui-guardian": "UI Guardian",
    "qa-verifier": "QA Verifier",
  };

  let summary = `**${roleNames[fromRole]} Handoff**\n\n`;
  summary += `Files changed: ${handoff.filesChanged.length}\n`;

  if (fromRole === "builder") {
    const h = handoff as BuilderHandoff;
    summary += `\n- Logic Complete: ${h.logicComplete ? "✅" : "❌"}\n`;
    summary += `- Tests Pass: ${h.testsPass ? "✅" : "❌"}\n`;
    if (h.uiNote) summary += `\n**Note for UI Guardian:** ${h.uiNote}\n`;
  } else if (fromRole === "ui-guardian") {
    const h = handoff as UIHandoff;
    summary += `\n- Design Compliant: ${h.designCompliant ? "✅" : "❌"}\n`;
    summary += `- Responsive: ${h.responsive ? "✅" : "❌"}\n`;
    summary += `- Accessibility: ${h.accessibilityPass ? "✅" : "❌"}\n`;
    if (h.visualNotes) summary += `\n**Visual Notes:** ${h.visualNotes}\n`;
  } else if (fromRole === "qa-verifier") {
    const h = handoff as QAHandoff;
    summary += `\n- Scope Match: ${h.scopeMatch ? "✅" : "❌"}\n`;
    summary += `- Regressions: ${h.regressions ? "⚠️ Found" : "✅ None"}\n`;
    summary += `- Edge Cases: ${h.edgeCasesHandled ? "✅ Handled" : "⚠️ Pending"}\n`;
    summary += `- Ready for User: ${h.readyForUser ? "✅ YES" : "❌ NO"}\n`;
    if (h.issues && h.issues.length > 0) {
      summary += `\n**Issues Found:**\n${h.issues.map((i) => `- ${i}`).join("\n")}\n`;
    }
  }

  return summary;
}

/**
 * Determine next status based on handoff result.
 */
export function getNextStatus(fromRole: SubAgentRole, handoff: HandoffData): "in-progress" | "review" | "backlog" {
  // If QA says ready for user, move to review
  if (fromRole === "qa-verifier") {
    const h = handoff as QAHandoff;
    return h.readyForUser ? "review" : "backlog";
  }

  // If UI Guardian completes, hand off to QA
  if (fromRole === "ui-guardian") {
    return "in-progress"; // QA will pick it up
  }

  // If Builder completes, hand off to UI Guardian
  if (fromRole === "builder") {
    return "in-progress"; // UI Guardian will pick it up
  }

  return "in-progress";
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

/**
 * Create a handoff template for sub-agent prompts.
 * This helps sub-agents understand the expected output format.
 */
export function createHandoffTemplate(role: SubAgentRole): string {
  if (role === "builder") {
    return `{
  "filesChanged": ["path/to/file1.ts", "path/to/file2.tsx"],
  "logicComplete": true,
  "testsPass": true,
  "uiNote": "Basic styling applied, needs design system polish"
}`;
  } else if (role === "ui-guardian") {
    return `{
  "filesChanged": ["path/to/file.tsx"],
  "designCompliant": true,
  "responsive": true,
  "accessibilityPass": true,
  "changesApplied": ["Updated color tokens", "Added responsive breakpoints"]
}`;
  } else {
    return `{
  "filesChanged": ["path/to/file.ts"],
  "scopeMatch": true,
  "regressions": false,
  "edgeCasesHandled": true,
  "readyForUser": true
}`;
  }
}

/**
 * Update task status based on sub-agent handoff.
 * This should be called after a sub-agent completes.
 */
export async function updateTaskFromHandoff(
  taskId: string,
  fromRole: SubAgentRole,
  handoff: HandoffData,
): Promise<{ success: boolean; newStatus?: string; error?: string }> {
  try {
    // Validate handoff
    const validation = validateHandoff(handoff, fromRole);
    if (!validation.valid) {
      return { success: false, error: `Invalid handoff: ${validation.errors.join(", ")}` };
    }

    // Create comment for task history
    const commentText = createHandoffComment(taskId, fromRole, handoff);

    // POST to /api/control-center/tasks with add-comment action
    const response = await fetch("http://localhost:3000/api/control-center/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add-comment",
        taskId,
        text: commentText,
        author: fromRole === "builder" ? "Builder Sub-Agent" : fromRole === "ui-guardian" ? "UI Guardian" : "QA Verifier",
        authorType: "sub-agent",
      }),
    });

    if (!response.ok) {
      return { success: false, error: `Failed to add comment: ${response.statusText}` };
    }

    // Determine and return new status
    const newStatus = getNextStatus(fromRole, handoff);
    return { success: true, newStatus };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
