import { BindingConsole, type BindingRecord } from "./binding-console";
import { PageHeader } from "@/components/page-header";
import { apiRequest } from "@/lib/api-client";
import { getRequestMessages } from "@/lib/request-locale";

export default async function BindingsPage() {
  const { locale, messages } = await getRequestMessages();
  const currentBinding = await apiRequest<BindingRecord | null>({
    path: "/bindings/current",
    method: "GET",
  });
  const browserDesktopUrl = process.env.X_BROWSER_REMOTE_DESKTOP_URL?.trim() || null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={messages.bindings.eyebrow}
        title={messages.bindings.title}
        description={messages.bindings.description}
        badge={messages.enums.bindingStatus[currentBinding?.status ?? "UNBOUND"]}
      />
      <BindingConsole
        browserDesktopUrl={browserDesktopUrl}
        currentBinding={currentBinding}
        locale={locale}
      />
    </div>
  );
}
