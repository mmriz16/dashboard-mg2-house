export type ModelMeta = {
  id: string;
  displayName: string;
  provider: string;
  logoPath: string;
  badgeClass: string;
};

const PROVIDER_META: Record<string, Omit<ModelMeta, "id" | "displayName">> = {
  openai: {
    provider: "OpenAI",
    logoPath: "/logos/openai.svg",
    badgeClass: "text-emerald-300",
  },
  anthropic: {
    provider: "Anthropic",
    logoPath: "/logos/anthropic.svg",
    badgeClass: "text-amber-200",
  },
  google: {
    provider: "Google",
    logoPath: "/logos/google.svg",
    badgeClass: "text-sky-300",
  },
  xai: {
    provider: "xAI",
    logoPath: "/logos/xai.svg",
    badgeClass: "text-zinc-300",
  },
  meta: {
    provider: "Meta",
    logoPath: "/logos/meta.svg",
    badgeClass: "text-blue-300",
  },
  deepseek: {
    provider: "DeepSeek",
    logoPath: "/logos/deepseek.svg",
    badgeClass: "text-cyan-300",
  },
  qwen: {
    provider: "Qwen",
    logoPath: "/logos/qwen.svg",
    badgeClass: "text-violet-300",
  },
  default: {
    provider: "OpenClaw",
    logoPath: "/logos/openclaw.svg",
    badgeClass: "text-white/60",
  },
};

function detectProvider(modelId: string): keyof typeof PROVIDER_META {
  const id = modelId.toLowerCase();

  if (id.includes("gpt") || id.includes("openai")) return "openai";
  if (id.includes("claude") || id.includes("anthropic")) return "anthropic";
  if (id.includes("gemini") || id.includes("google")) return "google";
  if (id.includes("grok") || id.includes("xai")) return "xai";
  if (id.includes("llama") || id.includes("meta")) return "meta";
  if (id.includes("deepseek")) return "deepseek";
  if (id.includes("qwen") || id.includes("alibaba")) return "qwen";

  return "default";
}

function prettifyModelName(raw: string): string {
  return raw
    .replace(/^openai-codex\//i, "")
    .replace(/^openai\//i, "")
    .replace(/^anthropic\//i, "")
    .replace(/^google\//i, "")
    .replace(/^xai\//i, "")
    .replace(/^meta\//i, "")
    .replace(/^deepseek\//i, "")
    .replace(/^qwen\//i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b(gpt|claude|gemini|grok|llama|qwen)\b/gi, (m) => m.toUpperCase())
    .replace(/\bcodex\b/gi, "Codex")
    .replace(/\bmini\b/gi, "Mini")
    .replace(/\bflash\b/gi, "Flash")
    .trim();
}

export function getModelMeta(modelId?: string | null): ModelMeta {
  const id = (modelId || "").trim();
  if (!id) {
    return {
      id: "openclaw",
      displayName: "OpenClaw",
      ...PROVIDER_META.default,
    };
  }

  const providerKey = detectProvider(id);
  const providerMeta = PROVIDER_META[providerKey];

  return {
    id,
    displayName: prettifyModelName(id),
    provider: providerMeta.provider,
    logoPath: providerMeta.logoPath,
    badgeClass: providerMeta.badgeClass,
  };
}
