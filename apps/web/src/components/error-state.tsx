import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ErrorStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function ErrorState({ title, description, action }: ErrorStateProps) {
  return (
    <Card className="rounded-[2rem] border-red-200/80 bg-white/85 shadow-[0_24px_80px_-40px_rgba(185,92,0,0.22)] dark:border-red-400/25 dark:bg-[#2b1d18] dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
      <CardHeader className="gap-3">
        <div className="flex items-center gap-3 text-[#b95c00] dark:text-[#ffb366]">
          <AlertTriangle className="size-5" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription className="max-w-2xl leading-6 text-[#8b4a00] dark:text-[#ffd1a1]">
          {description}
        </CardDescription>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  );
}
