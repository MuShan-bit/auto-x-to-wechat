"use client";

import { useActionState } from "react";
import { loginAction, type LoginFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <Card className="rounded-[2rem] border-border/70 bg-white/95 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.35)]">
      <CardHeader>
        <CardTitle className="text-2xl">登录平台</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              邮箱
            </label>
            <Input id="email" name="email" type="email" placeholder="demo@example.com" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              密码
            </label>
            <Input id="password" name="password" type="password" placeholder="demo123456" />
          </div>
          {state.error ? (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {state.error}
            </p>
          ) : null}
          <Button className="w-full rounded-full bg-[#2d4d3f] hover:bg-[#20372d]" disabled={isPending} type="submit">
            {isPending ? "登录中..." : "进入系统"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
