import { Suspense } from "react";
import { LockKeyhole, Sparkles } from "lucide-react";
import { LoginForm } from "./login-form";
import { LoadingState } from "@/components/loading-state";
import { Badge } from "@/components/ui/badge";

export default function LoginPage() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <section className="space-y-5 rounded-[2.5rem] border border-border/70 bg-[#1f3128] p-8 text-white shadow-[0_24px_80px_-40px_rgba(31,49,40,0.85)]">
        <Badge className="w-fit rounded-full bg-white/12 text-white hover:bg-white/12">
          Development Auth
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight">
          登录后才能访问绑定、归档和任务页面
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
          当前开发阶段使用平台账号密码登录，并通过 NextAuth + Prisma Adapter
          将用户会话持久化到 PostgreSQL。后续再扩展邮箱验证码或 OAuth 登录时，
          不需要推翻现有受保护路由结构。
        </p>
        <div className="grid gap-3 rounded-[2rem] border border-white/10 bg-white/8 p-5 text-sm text-white/85">
          <div className="flex items-center gap-2 font-medium">
            <LockKeyhole className="size-4" />
            开发环境测试账号
          </div>
          <p>邮箱：`demo@example.com`</p>
          <p>密码：`demo123456`</p>
          <div className="mt-2 flex items-center gap-2 text-white/65">
            <Sparkles className="size-4" />
            当前账号由数据库种子脚本自动创建。
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <LoadingState
            title="正在准备登录表单"
            description="正在读取登录回跳地址并初始化会话表单。"
          />
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
