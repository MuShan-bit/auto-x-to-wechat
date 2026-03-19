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
    <Card className="rounded-[2rem] border-red-200/80 bg-white/90 shadow-[0_24px_80px_-40px_rgba(185,92,0,0.22)]">
      <CardHeader className="gap-3">
        <div className="flex items-center gap-3 text-[#b95c00]">
          <AlertTriangle className="size-5" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription className="max-w-2xl leading-6 text-[#8b4a00]">
          {description}
        </CardDescription>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  );
}
