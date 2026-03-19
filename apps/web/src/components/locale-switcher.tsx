"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getMessages, localeCookieName, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LocaleSwitcherProps = {
  locale: Locale;
};

export function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const router = useRouter();
  const messages = getMessages(locale);
  const [currentLocale, setCurrentLocale] = useState(locale);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCurrentLocale(locale);
  }, [locale]);

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white/80 p-1 shadow-sm dark:border-white/10 dark:bg-white/6">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
        <Languages className="size-4" />
      </span>
      {(["zh-CN", "en"] as const).map((nextLocale) => {
        const active = nextLocale === currentLocale;

        return (
          <Button
            key={nextLocale}
            type="button"
            size="sm"
            variant={active ? "secondary" : "ghost"}
            className={cn(
              "rounded-full px-3",
              active
                ? "bg-[#2d4d3f] text-white hover:bg-[#2d4d3f] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#d8e2db]"
                : "text-foreground hover:bg-white dark:hover:bg-white/10",
            )}
            aria-label={`${messages.shell.localeLabel}：${messages.shell.localeOptions[nextLocale]}`}
            disabled={isPending || active}
            onClick={() => {
              document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
              setCurrentLocale(nextLocale);
              startTransition(() => {
                router.refresh();
              });
            }}
          >
            {messages.shell.localeOptions[nextLocale]}
          </Button>
        );
      })}
    </div>
  );
}
