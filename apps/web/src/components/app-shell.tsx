import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

const navigation = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/bindings", label: "Bindings" },
  { href: "/archives", label: "Archives" },
  { href: "/runs", label: "Runs" },
];

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const navLinkClassName =
    "inline-flex h-8 items-center justify-center rounded-full px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f2efe7_0%,#fffdf7_32%,#ffffff_100%)] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-20 mb-8 rounded-3xl border border-border/70 bg-white/85 px-5 py-4 shadow-[0_18px_60px_-32px_rgba(87,62,22,0.35)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2d4d3f] text-sm font-semibold tracking-[0.2em] text-white">
                XW
              </div>
              <div>
                <Link href="/" className="text-lg font-semibold tracking-tight">
                  auto-x-to-wechat
                </Link>
                <p className="text-sm text-muted-foreground">
                  X 推荐流归档与任务平台
                </p>
              </div>
              <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">
                MVP Setup
              </Badge>
            </div>
            <nav className="flex flex-wrap items-center gap-2">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href} className={navLinkClassName}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
