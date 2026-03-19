-- CreateEnum
CREATE TYPE "BindingBrowserSessionStatus" AS ENUM ('PENDING', 'WAITING_LOGIN', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "binding_browser_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "binding_id" TEXT,
    "status" "BindingBrowserSessionStatus" NOT NULL DEFAULT 'PENDING',
    "login_url" TEXT NOT NULL,
    "captured_payload_encrypted" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "x_user_id" TEXT,
    "username" TEXT,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "binding_browser_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "binding_browser_sessions_user_id_created_at_idx" ON "binding_browser_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "binding_browser_sessions_status_expires_at_idx" ON "binding_browser_sessions"("status", "expires_at");

-- AddForeignKey
ALTER TABLE "binding_browser_sessions" ADD CONSTRAINT "binding_browser_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "binding_browser_sessions" ADD CONSTRAINT "binding_browser_sessions_binding_id_fkey" FOREIGN KEY ("binding_id") REFERENCES "x_account_bindings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
