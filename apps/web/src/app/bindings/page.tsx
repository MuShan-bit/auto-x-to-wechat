import { BindingConsole, type BindingRecord } from "./binding-console";
import { PageHeader } from "@/components/page-header";
import { apiRequest } from "@/lib/api-client";

export default async function BindingsPage() {
  const currentBinding = await apiRequest<BindingRecord | null>({
    path: "/bindings/current",
    method: "GET",
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Bindings"
        description="这里已经接入绑定读取、凭证提交、重新校验、停用和抓取配置编辑。下一步会继续补手动抓取与任务记录联动。"
        badge={currentBinding?.status ?? "UNBOUND"}
      />
      <BindingConsole currentBinding={currentBinding} />
    </div>
  );
}
