import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function RunsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Task History"
        title="Runs"
        description="这里将展示抓取任务执行记录、统计结果、失败原因和处理详情。"
      />
      <EmptyState
        title="任务记录页等待接入后端执行记录"
        description="等抓取调度与任务记录模块完成后，这里会变成可分页的执行历史列表。"
      />
    </div>
  );
}
