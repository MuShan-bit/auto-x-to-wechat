import type { ReactNode } from "react";
import { ShellHeader } from "@/components/shell-header";
import { type Locale } from "@/lib/i18n";
import { type ThemePreference } from "@/lib/theme";

type AppShellProps = {
  children: ReactNode;
  locale: Locale;
  theme: ThemePreference;
};

export function AppShell({ children, locale, theme }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(245,239,228,0.95),transparent_34%),linear-gradient(180deg,#f2efe7_0%,#fffdf7_34%,#ffffff_100%)] text-foreground transition-colors dark:bg-[radial-gradient(circle_at_top_left,rgba(88,72,47,0.3),transparent_28%),linear-gradient(180deg,#0f1411_0%,#131a16_36%,#0f1311_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <ShellHeader locale={locale} theme={theme} />
        <main className="flex-1 pb-10">{children}</main>
      </div>
    </div>
  );
}
