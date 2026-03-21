export type AiProviderType =
  | "OPENAI"
  | "ANTHROPIC"
  | "GEMINI"
  | "OPENAI_COMPATIBLE";

export type AiTaskType = "POST_CLASSIFY" | "REPORT_SUMMARY" | "DRAFT_REWRITE";

export type AiProviderRecord = {
  id: string;
  providerType: AiProviderType;
  name: string;
  baseUrl: string | null;
  enabled: boolean;
  hasApiKey: boolean;
  models: Array<{
    id: string;
    providerConfigId: string;
    modelCode: string;
    displayName: string;
    taskType: AiTaskType;
    isDefault: boolean;
    enabled: boolean;
    parametersJson: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type AiModelRecord = {
  id: string;
  providerConfigId: string;
  modelCode: string;
  displayName: string;
  taskType: AiTaskType;
  isDefault: boolean;
  enabled: boolean;
  parametersJson: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  provider: {
    id: string;
    providerType: AiProviderType;
    name: string;
    baseUrl: string | null;
    enabled: boolean;
    hasApiKey: boolean;
  };
};
