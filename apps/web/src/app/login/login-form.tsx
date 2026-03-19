"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getMessages, type Locale } from "@/lib/i18n";

const initialState: LoginFormState = {};

export function LoginForm({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  return (
    <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.35)] dark:border-white/10 dark:bg-[#1b231e] dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.55)]">
      <CardHeader className="gap-3">
        <CardTitle className="text-2xl">{messages.login.formTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              {messages.login.emailLabel}
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="demo@example.com"
              className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4 dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder:text-white/40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              {messages.login.passwordLabel}
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="demo123456"
              className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4 dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder:text-white/40"
            />
          </div>
          {state.error ? (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-200">
              {state.error}
            </p>
          ) : null}
          <p className="rounded-[1.5rem] bg-[#fcfaf5] px-4 py-3 text-sm leading-6 text-muted-foreground dark:bg-white/6 dark:text-white/70">
            {messages.login.sessionHint}
          </p>
          <Button
            className="h-11 w-full rounded-full bg-[#2d4d3f] text-white hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
            disabled={isPending}
            type="submit"
          >
            {isPending ? messages.login.submitting : messages.login.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
