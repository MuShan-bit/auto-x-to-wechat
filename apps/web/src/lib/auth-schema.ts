import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("请输入有效邮箱"),
  password: z.string().min(8, "密码至少需要 8 位"),
});

export type SignInInput = z.infer<typeof signInSchema>;
