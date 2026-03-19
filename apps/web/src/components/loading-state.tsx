import { LoaderCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LoadingStateProps = {
  title?: string;
  description?: string;
};

export function LoadingState({
  title = "正在加载内容",
  description = "页面正在准备最新数据，请稍候。",
}: LoadingStateProps) {
  return (
    <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.2)]">
      <CardHeader className="gap-3">
        <div className="flex items-center gap-3 text-[#2d4d3f]">
          <LoaderCircle className="size-5 animate-spin" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-[#eef4f0]" />
        <div className="h-4 w-full animate-pulse rounded-full bg-[#f5efe4]" />
        <div className="h-4 w-5/6 animate-pulse rounded-full bg-[#eef4f0]" />
      </CardContent>
    </Card>
  );
}
