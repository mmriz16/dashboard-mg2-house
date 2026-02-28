import {
  OpenClawClient,
  type AgentSummary,
  type SubagentSummary,
  type ManagedFile,
  type CronJob,
  type HeartbeatConfig,
} from './client';

const getClient = () => {
  const baseUrl =
    process.env.OPENCLAW_API_URL ||
    process.env.OPENCLAW_BASE_URL ||
    'http://127.0.0.1:18789';
  const apiKey = process.env.OPENCLAW_API_KEY;
  return new OpenClawClient({ baseUrl, apiKey });
};

export async function listAgents(): Promise<AgentSummary[]> {
  try {
    return await getClient().listAgents();
  } catch {
    return [];
  }
}

export async function listSubagents(): Promise<SubagentSummary[]> {
  try {
    return await getClient().listSubagents();
  } catch {
    return [];
  }
}

export async function steerSubagent(id: string, message: string): Promise<{ ok: boolean }> {
  return getClient().steerSubagent(id, message);
}

export async function killSubagent(id: string): Promise<{ ok: boolean }> {
  return getClient().killSubagent(id);
}

export async function listFiles(): Promise<ManagedFile[]> {
  try {
    return await getClient().listFiles();
  } catch {
    return [];
  }
}

export async function getFileContent(path: string): Promise<{ path: string; content: string }> {
  return getClient().getFileContent(path);
}

export async function createFile(path: string, content: string): Promise<{ ok: boolean }> {
  return getClient().createFile(path, content);
}

export async function updateFile(path: string, content: string): Promise<{ ok: boolean }> {
  return getClient().updateFile(path, content);
}

export async function deleteFile(path: string): Promise<{ ok: boolean }> {
  return getClient().deleteFile(path);
}

export async function listCronJobs(): Promise<CronJob[]> {
  return getClient().listCronJobs();
}

export async function createCronJob(payload: Record<string, unknown>): Promise<CronJob> {
  return getClient().createCronJob(payload);
}

export async function updateCronJob(id: string, payload: Record<string, unknown>): Promise<CronJob> {
  return getClient().updateCronJob(id, payload);
}

export async function deleteCronJob(id: string): Promise<{ ok: boolean }> {
  return getClient().deleteCronJob(id);
}

export async function runCronNow(id: string): Promise<{ ok: boolean }> {
  return getClient().runCronNow(id);
}

export async function getHeartbeat(): Promise<HeartbeatConfig> {
  return getClient().getHeartbeat();
}

export async function updateHeartbeat(payload: Partial<HeartbeatConfig>): Promise<HeartbeatConfig> {
  return getClient().updateHeartbeat(payload);
}

export async function triggerHeartbeat(): Promise<{ ok: boolean }> {
  return getClient().triggerHeartbeat();
}
