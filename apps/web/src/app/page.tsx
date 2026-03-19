import Link from "next/link";
import { ArrowRight, Database, LayoutDashboard, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRequestMessages } from "@/lib/request-locale";

const setupIcons = [LayoutDashboard, ShieldCheck, Database];

export default async function Home() {
  const { messages } = await getRequestMessages();
  const primaryLinkClassName =
    "inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]";
  const secondaryLinkClassName =
    "inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/6 dark:hover:bg-white/10";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={messages.home.eyebrow}
        title={messages.home.title}
        description={messages.home.description}
        badge={messages.home.badge}
        actions={
          <>
            <Link href="/dashboard" className={primaryLinkClassName}>
              {messages.home.actions.dashboard}
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/bindings" className={secondaryLinkClassName}>
              {messages.home.actions.bindings}
            </Link>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        {messages.home.setupCards.map(({ title, description }, index) => {
          const Icon = setupIcons[index]!;

          return (
            <Card
              key={title}
              className="rounded-[2rem] border-border/70 bg-white/78 shadow-[0_20px_60px_-38px_rgba(87,62,22,0.35)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_20px_60px_-38px_rgba(0,0,0,0.5)]"
            >
              <CardHeader className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efe6d7] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
                  <Icon className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">{title}</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6">
                    {description}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="rounded-[2rem] border-border/70 bg-[linear-gradient(135deg,#1f3128,#274135)] text-white shadow-[0_24px_80px_-40px_rgba(31,49,40,0.85)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#18201b,#223028)]">
          <CardHeader>
            <Badge className="w-fit rounded-full bg-white/12 text-white hover:bg-white/12">
              {messages.home.progress.badge}
            </Badge>
            <CardTitle className="mt-3 text-2xl">{messages.home.progress.title}</CardTitle>
            <CardDescription className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              {messages.home.progress.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {messages.home.progress.milestones.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4 text-sm text-white/85"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/70 bg-white/78 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.2)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.45)]">
          <CardHeader className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
              <Database className="size-5" />
            </div>
            <div>
              <CardTitle className="text-2xl">{messages.home.nextStep.title}</CardTitle>
              <CardDescription className="mt-3 text-sm leading-7">
                {messages.home.nextStep.description}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.5rem] bg-[#fcfaf5] p-5 text-sm leading-7 text-foreground dark:bg-white/8">
              {messages.home.nextStep.action}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
                Next.js
              </Badge>
              <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                NestJS
              </Badge>
              <Badge className="rounded-full bg-[#fcfaf5] text-foreground dark:bg-white/8">
                Prisma
              </Badge>
              <Badge className="rounded-full bg-[#fcfaf5] text-foreground dark:bg-white/8">
                PostgreSQL
              </Badge>
              <Badge className="rounded-full bg-[#fcfaf5] text-foreground dark:bg-white/8">
                NextAuth.js
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
