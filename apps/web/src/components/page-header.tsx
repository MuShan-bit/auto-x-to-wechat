import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
}: PageHeaderProps) {
  return (
    <section className="mb-8 grid gap-5 rounded-[2rem] border border-border/70 bg-white/78 p-6 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.35)] backdrop-blur dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)] lg:grid-cols-[1fr_auto] lg:items-end">
      <div className="space-y-3">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7f5a26] dark:text-[#f2c58c]">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          {badge ? (
            <Badge className="rounded-full bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]">
              {badge}
            </Badge>
          ) : null}
        </div>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      {actions ? (
        <div className="flex flex-wrap justify-start gap-3 lg:justify-end">{actions}</div>
      ) : null}
    </section>
  );
}
