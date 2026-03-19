import { Suspense } from "react";
import { LockKeyhole, Sparkles } from "lucide-react";
import { LoginForm } from "./login-form";
import { LoadingState } from "@/components/loading-state";
import { Badge } from "@/components/ui/badge";
import { getRequestMessages } from "@/lib/request-locale";

export default async function LoginPage() {
  const { locale, messages } = await getRequestMessages();

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <section className="space-y-5 rounded-[2.5rem] border border-border/70 bg-[linear-gradient(135deg,#1f3128,#294134)] p-8 text-white shadow-[0_24px_80px_-40px_rgba(31,49,40,0.85)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#18201b,#223028)] dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.55)]">
        <Badge className="w-fit rounded-full bg-white/12 text-white hover:bg-white/12">
          {messages.login.heroBadge}
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight">
          {messages.login.heroTitle}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
          {messages.login.heroDescription}
        </p>
        <div className="grid gap-3 rounded-[2rem] border border-white/10 bg-white/8 p-5 text-sm text-white/85 dark:bg-white/6">
          <div className="flex items-center gap-2 font-medium">
            <LockKeyhole className="size-4" />
            {messages.login.accountTitle}
          </div>
          <p>{messages.login.accountEmail}</p>
          <p>{messages.login.accountPassword}</p>
          <div className="mt-2 flex items-center gap-2 text-white/65">
            <Sparkles className="size-4" />
            {messages.login.accountHint}
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <LoadingState
            title={messages.login.loadingTitle}
            description={messages.login.loadingDescription}
          />
        }
      >
        <LoginForm locale={locale} />
      </Suspense>
    </div>
  );
}
