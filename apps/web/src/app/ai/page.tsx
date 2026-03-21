import { AiConsole } from "./ai-console";
import type { AiModelRecord, AiProviderRecord } from "./ai-types";
import { PageHeader } from "@/components/page-header";
import { formatMessage } from "@/lib/i18n";
import { apiRequest } from "@/lib/api-client";
import { getRequestMessages } from "@/lib/request-locale";

async function getAiData() {
  const [providersResult, modelsResult] = await Promise.allSettled([
    apiRequest<AiProviderRecord[]>({
      path: "/ai/providers?includeDisabled=true",
      method: "GET",
    }),
    apiRequest<AiModelRecord[]>({
      path: "/ai/models?includeDisabled=true",
      method: "GET",
    }),
  ]);

  return {
    providers:
      providersResult.status === "fulfilled" ? providersResult.value : [],
    models: modelsResult.status === "fulfilled" ? modelsResult.value : [],
    hasError:
      providersResult.status === "rejected" ||
      modelsResult.status === "rejected",
  };
}

export default async function AiPage() {
  const { locale, messages } = await getRequestMessages();
  const { providers, models, hasError } = await getAiData();

  return (
    <div className="space-y-8">
      <PageHeader
        badge={formatMessage(messages.ai.badge, {
          count: models.length,
        })}
        description={messages.ai.description}
        eyebrow={messages.ai.eyebrow}
        title={messages.ai.title}
      />
      <AiConsole
        loadError={hasError ? messages.ai.errorDescription : null}
        locale={locale}
        models={models}
        providers={providers}
      />
    </div>
  );
}
