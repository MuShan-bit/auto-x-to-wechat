import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function ArchivesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Archive"
        title="Archives"
        description="这里将展示归档后的帖子卡片列表、分页器和筛选能力。"
      />
      <EmptyState
        title="归档列表页尚未接入"
        description="完成归档查询接口后，这里会切换成卡片列表与分页浏览界面。"
      />
    </div>
  );
}
