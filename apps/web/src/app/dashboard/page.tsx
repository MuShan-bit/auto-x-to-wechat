import { logoutAction } from "./actions";
import { PageHeader } from "@/components/page-header";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CurrentUserResponse = {
  user: {
    email?: string;
    id: string;
    role?: string;
  };
};

export default async function DashboardPage() {
  const data = await apiRequest<CurrentUserResponse>({
    path: "/internal/me",
    method: "GET",
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Dashboard"
        description="这里已经接入了 NextAuth 保护和 Web 到 API 的内部用户上下文透传，后面可以继续在此基础上叠加真实业务数据。"
        actions={
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="rounded-full">
              退出登录
            </Button>
          </form>
        }
      />
      <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.35)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            当前登录用户
            <Badge className="rounded-full bg-[#2d4d3f] text-white">{data.user.role ?? "USER"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-[#f5efe4] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[#7f5a26]">User Id</p>
            <p className="mt-2 font-mono text-sm text-foreground">{data.user.id}</p>
          </div>
          <div className="rounded-3xl bg-[#eef4f0] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[#2d4d3f]">Email</p>
            <p className="mt-2 text-sm text-foreground">{data.user.email ?? "No email"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
