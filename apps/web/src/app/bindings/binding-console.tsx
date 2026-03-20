"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCrawlProfileAction,
  disableBindingAction,
  revalidateBindingAction,
  type BindingActionState,
  triggerCrawlProfileAction,
  triggerManualCrawlAction,
  unbindBindingAction,
  updateCrawlProfileAction,
  updateCrawlConfigAction,
  upsertBindingAction,
} from "./actions";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMessage, getIntlLocale, getMessages, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type BindingRecord = {
  crawlProfiles: Array<{
    enabled: boolean;
    id: string;
    intervalMinutes: number;
    language: string | null;
    lastRunAt: string | null;
    maxPosts: number;
    mode: "RECOMMENDED" | "HOT" | "SEARCH";
    nextRunAt: string | null;
    queryText: string | null;
    region: string | null;
  }>;
  id: string;
  xUserId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: "ACTIVE" | "DISABLED" | "INVALID" | "PENDING";
  credentialSource: "COOKIE_IMPORT" | "EXTENSION" | "WEB_LOGIN";
  crawlEnabled: boolean;
  crawlIntervalMinutes: number;
  lastValidatedAt: string | null;
  lastCrawledAt: string | null;
  nextCrawlAt: string | null;
  lastErrorMessage: string | null;
  updatedAt: string;
  crawlJob:
    | {
        enabled: boolean;
        intervalMinutes: number;
        lastRunAt: string | null;
        nextRunAt: string | null;
      }
    | null;
};

type BindingConsoleProps = {
  browserDesktopUrl: string | null;
  bindings: BindingRecord[];
  locale: Locale;
};

type BindingBrowserSessionRecord = {
  id: string;
  bindingId: string | null;
  status: "PENDING" | "WAITING_LOGIN" | "SUCCESS" | "FAILED" | "EXPIRED" | "CANCELLED";
  loginUrl: string;
  expiresAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  xUserId: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  binding: BindingRecord | null;
};

const initialActionState: BindingActionState = {};
const browserBindingSessionStorageKey = "auto-x-to-wechat.binding-browser-session-id";

function formatDateTime(value: string | null | undefined, locale: Locale, emptyLabel: string) {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isBrowserSessionActive(status: BindingBrowserSessionRecord["status"]) {
  return status === "PENDING" || status === "WAITING_LOGIN";
}

function getBrowserSessionBadgeClassName(status: BindingBrowserSessionRecord["status"]) {
  return {
    PENDING: "bg-[#7f5a26] text-white dark:bg-[#4b3a1e] dark:text-[#f2c58c]",
    WAITING_LOGIN: "bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]",
    SUCCESS: "bg-emerald-600 text-white dark:bg-emerald-950/40 dark:text-emerald-100",
    FAILED: "bg-red-600 text-white dark:bg-red-950/40 dark:text-red-200",
    EXPIRED: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/80",
    CANCELLED: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/80",
  }[status];
}

async function requestBrowserSession<T>(
  path: string,
  fallbackMessage: string,
  init?: RequestInit,
) {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
  });
  const payload = (await response.json()) as T | { error?: string };

  if (!response.ok) {
    throw new Error(
      typeof (payload as { error?: string }).error === "string"
        ? (payload as { error?: string }).error
        : fallbackMessage,
    );
  }

  return payload as T;
}

function StatusBadge({
  label,
  status,
}: {
  label: string;
  status: BindingRecord["status"] | "UNBOUND";
}) {
  const className = {
    ACTIVE: "bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]",
    INVALID: "bg-[#b95c00] text-white dark:bg-[#5a2e00] dark:text-[#ffd1a1]",
    DISABLED: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/80",
    PENDING: "bg-[#7f5a26] text-white dark:bg-[#4b3a1e] dark:text-[#f2c58c]",
    UNBOUND: "bg-[#f4ebdb] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]",
  }[status];

  return <Badge className={cn("rounded-full", className)}>{label}</Badge>;
}

function FormFeedback({
  state,
}: {
  state: BindingActionState;
}) {
  const actionLink =
    state.actionHref && state.actionLabel ? (
      <Link
        href={state.actionHref}
        className="mt-3 inline-flex h-8 items-center justify-center rounded-full bg-white px-3 text-xs font-medium transition-colors hover:bg-slate-100 dark:bg-white/10 dark:text-white dark:hover:bg-white/14"
      >
        {state.actionLabel}
      </Link>
    ) : null;

  if (state.error) {
    return (
      <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-200">
        <p>{state.error}</p>
        {actionLink}
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100">
        <p>{state.success}</p>
        {state.actionHref && state.actionLabel ? (
          <Link
            href={state.actionHref}
            className="mt-3 inline-flex h-8 items-center justify-center rounded-full bg-white px-3 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-white/10 dark:text-emerald-100 dark:hover:bg-white/14"
          >
            {state.actionLabel}
          </Link>
        ) : null}
      </div>
    );
  }

  return null;
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor: string;
}) {
  return (
    <label className="text-sm font-medium text-foreground" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export function BindingConsole({
  browserDesktopUrl,
  bindings,
  locale,
}: BindingConsoleProps) {
  const messages = getMessages(locale);
  const credentialSourceOptions = [
    { value: "WEB_LOGIN", label: messages.enums.credentialSource.WEB_LOGIN },
    { value: "COOKIE_IMPORT", label: messages.enums.credentialSource.COOKIE_IMPORT },
    { value: "EXTENSION", label: messages.enums.credentialSource.EXTENSION },
  ] as const;
  const router = useRouter();
  const [upsertState, upsertAction, isUpserting] = useActionState(
    upsertBindingAction,
    initialActionState,
  );
  const [configState, configAction, isConfigPending] = useActionState(
    updateCrawlConfigAction,
    initialActionState,
  );
  const [validateState, validateAction, isValidatePending] = useActionState(
    revalidateBindingAction,
    initialActionState,
  );
  const [manualCrawlState, manualCrawlAction, isManualCrawlPending] = useActionState(
    triggerManualCrawlAction,
    initialActionState,
  );
  const [createProfileState, createProfileAction, isCreateProfilePending] = useActionState(
    createCrawlProfileAction,
    initialActionState,
  );
  const [updateProfileState, updateProfileAction, isUpdateProfilePending] = useActionState(
    updateCrawlProfileAction,
    initialActionState,
  );
  const [manualProfileState, manualProfileAction, isManualProfilePending] = useActionState(
    triggerCrawlProfileAction,
    initialActionState,
  );
  const [disableState, disableAction, isDisablePending] = useActionState(
    disableBindingAction,
    initialActionState,
  );
  const [unbindState, unbindAction, isUnbindPending] = useActionState(
    unbindBindingAction,
    initialActionState,
  );
  const [browserSession, setBrowserSession] = useState<BindingBrowserSessionRecord | null>(null);
  const [browserSessionError, setBrowserSessionError] = useState<string | null>(null);
  const [isBrowserSessionPending, startBrowserSessionTransition] = useTransition();
  const refreshedBrowserSessionIdRef = useRef<string | null>(null);
  const isBrowserSessionPollingRef = useRef(false);
  const [selectedBindingId, setSelectedBindingId] = useState<string | null>(bindings[0]?.id ?? null);
  const currentBinding =
    bindings.find((binding) => binding.id === selectedBindingId) ?? bindings[0] ?? null;

  useEffect(() => {
    const storedSessionId = window.sessionStorage.getItem(browserBindingSessionStorageKey);

    if (!storedSessionId) {
      return;
    }

    let cancelled = false;

    async function restoreBrowserSession() {
      try {
        const nextSession = await requestBrowserSession<BindingBrowserSessionRecord>(
          `/api/bindings/browser-sessions/${storedSessionId}`,
          messages.bindings.browserSessionRequestFailed,
        );

        if (cancelled) {
          return;
        }

        setBrowserSession(nextSession);
        setBrowserSessionError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setBrowserSessionError(
          error instanceof Error ? error.message : messages.bindings.browserSessionRestoreFailed,
        );
        window.sessionStorage.removeItem(browserBindingSessionStorageKey);
      }
    }

    void restoreBrowserSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!browserSession) {
      window.sessionStorage.removeItem(browserBindingSessionStorageKey);
      return;
    }

    if (isBrowserSessionActive(browserSession.status)) {
      window.sessionStorage.setItem(browserBindingSessionStorageKey, browserSession.id);
      return;
    }

    window.sessionStorage.removeItem(browserBindingSessionStorageKey);
  }, [browserSession]);

  useEffect(() => {
    if (!browserSession?.bindingId) {
      return;
    }

    const matchedBinding = bindings.find((binding) => binding.id === browserSession.bindingId);

    if (!matchedBinding || matchedBinding.id === selectedBindingId) {
      return;
    }

    setSelectedBindingId(matchedBinding.id);
  }, [bindings, browserSession?.bindingId, selectedBindingId]);

  useEffect(() => {
    if (!browserSession || !isBrowserSessionActive(browserSession.status)) {
      return;
    }

    let cancelled = false;
    const sessionId = browserSession.id;

    async function pollBrowserSession() {
      if (isBrowserSessionPollingRef.current) {
        return;
      }

      isBrowserSessionPollingRef.current = true;

      try {
        const nextSession = await requestBrowserSession<BindingBrowserSessionRecord>(
          `/api/bindings/browser-sessions/${sessionId}`,
          messages.bindings.browserSessionRequestFailed,
        );

        if (cancelled) {
          return;
        }

        setBrowserSession(nextSession);
        setBrowserSessionError(null);

        if (
          nextSession.status === "SUCCESS" &&
          refreshedBrowserSessionIdRef.current !== nextSession.id
        ) {
          refreshedBrowserSessionIdRef.current = nextSession.id;
          router.refresh();
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setBrowserSessionError(
          error instanceof Error ? error.message : messages.bindings.browserSessionPollingFailed,
        );
      } finally {
        isBrowserSessionPollingRef.current = false;
      }
    }

    void pollBrowserSession();

    const timer = window.setInterval(() => {
      void pollBrowserSession();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [browserSession, router]);

  function handleStartBrowserBinding() {
    const remoteDesktopWindow = browserDesktopUrl ? window.open(browserDesktopUrl, "_blank") : null;

    startBrowserSessionTransition(() => {
      void (async () => {
        try {
          const nextSession = await requestBrowserSession<BindingBrowserSessionRecord>(
            "/api/bindings/browser-sessions",
            messages.bindings.browserSessionRequestFailed,
            {
              method: "POST",
            },
          );

          refreshedBrowserSessionIdRef.current = null;
          setBrowserSession(nextSession);
          setBrowserSessionError(null);
        } catch (error) {
          remoteDesktopWindow?.close();
          setBrowserSessionError(
            error instanceof Error ? error.message : messages.bindings.browserSessionStartFailed,
          );
        }
      })();
    });
  }

  function handleCancelBrowserBinding() {
    if (!browserSession) {
      return;
    }

    startBrowserSessionTransition(() => {
      void (async () => {
        try {
          const nextSession = await requestBrowserSession<BindingBrowserSessionRecord>(
            `/api/bindings/browser-sessions/${browserSession.id}/cancel`,
            messages.bindings.browserSessionRequestFailed,
            {
              method: "POST",
            },
          );

          setBrowserSession(nextSession);
          setBrowserSessionError(null);
        } catch (error) {
          setBrowserSessionError(
            error instanceof Error ? error.message : messages.bindings.browserSessionCancelFailed,
          );
        }
      })();
    });
  }

  function handleUnbindSubmit(event: React.FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(messages.bindings.unbindConfirm);

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="space-y-6">
        <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.25)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">{messages.bindings.accountListTitle}</CardTitle>
                <CardDescription className="mt-2 leading-6">
                  {messages.bindings.accountListDescription}
                </CardDescription>
              </div>
              <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                {formatMessage(messages.bindings.accountCount, {
                  count: bindings.length,
                })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {bindings.length > 0 ? (
              bindings.map((binding) => {
                const isSelected = binding.id === currentBinding?.id;

                return (
                  <button
                    key={binding.id}
                    type="button"
                    onClick={() => setSelectedBindingId(binding.id)}
                    className={cn(
                      "rounded-[1.75rem] border px-5 py-4 text-left transition-colors",
                      isSelected
                        ? "border-[#2d4d3f]/40 bg-[#eef4f0] shadow-[0_16px_50px_-34px_rgba(45,77,63,0.45)] dark:border-[#d8e2db]/25 dark:bg-[#223228]"
                        : "border-border/70 bg-[#fcfaf5] hover:border-[#c7b08a]/50 hover:bg-[#f8f3eb] dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">
                          @{binding.username}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {binding.displayName ?? messages.common.noDisplayName}
                        </p>
                      </div>
                      <StatusBadge
                        label={messages.enums.bindingStatus[binding.status]}
                        status={binding.status}
                      />
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {messages.bindings.lastValidatedAt}
                        </dt>
                        <dd className="mt-1 text-foreground">
                          {formatDateTime(
                            binding.lastValidatedAt,
                            locale,
                            messages.common.notRecorded,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {messages.bindings.nextCrawlAt}
                        </dt>
                        <dd className="mt-1 text-foreground">
                          {formatDateTime(
                            binding.crawlJob?.nextRunAt ?? binding.nextCrawlAt,
                            locale,
                            messages.common.notScheduled,
                          )}
                        </dd>
                      </div>
                    </dl>
                  </button>
                );
              })
            ) : (
              <EmptyState
                title={messages.bindings.emptyTitle}
                description={messages.bindings.emptyDescription}
              />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.35)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-2xl">{messages.bindings.statusTitle}</CardTitle>
              <StatusBadge
                label={messages.enums.bindingStatus[currentBinding?.status ?? "UNBOUND"]}
                status={currentBinding?.status ?? "UNBOUND"}
              />
            </div>
            <CardDescription className="leading-6">
              {messages.bindings.statusDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {currentBinding ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-[#f5efe4] p-5 dark:bg-[#3d3124]">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#7f5a26] dark:text-[#f2c58c]">
                      {messages.bindings.username}
                    </p>
                    <p className="mt-2 text-base font-medium text-foreground">
                      @{currentBinding.username}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {currentBinding.displayName ?? messages.common.noDisplayName}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[#eef4f0] p-5 dark:bg-[#223228]">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#2d4d3f] dark:text-[#d8e2db]">
                      {messages.bindings.xUserId}
                    </p>
                    <p className="mt-2 font-mono text-sm text-foreground">{currentBinding.xUserId}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {messages.bindings.credentialSource}：
                      {credentialSourceOptions.find((item) => item.value === currentBinding.credentialSource)?.label}
                    </p>
                  </div>
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3 dark:border-white/10 dark:bg-white/8">
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {messages.bindings.lastValidatedAt}
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {formatDateTime(
                        currentBinding.lastValidatedAt,
                        locale,
                        messages.common.notRecorded,
                      )}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3 dark:border-white/10 dark:bg-white/8">
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {messages.bindings.nextCrawlAt}
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {formatDateTime(
                        currentBinding.crawlJob?.nextRunAt ?? currentBinding.nextCrawlAt,
                        locale,
                        messages.common.notScheduled,
                      )}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3 dark:border-white/10 dark:bg-white/8">
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {messages.bindings.autoCrawlTitle}
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {currentBinding.crawlEnabled
                        ? messages.bindings.crawlEnabled
                        : messages.bindings.crawlDisabled}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3 dark:border-white/10 dark:bg-white/8">
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {messages.bindings.crawlIntervalLabel}
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {formatMessage(messages.bindings.crawlInterval, {
                        minutes: currentBinding.crawlIntervalMinutes,
                      })}
                    </dd>
                  </div>
                </dl>
                {currentBinding.lastErrorMessage ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-400/25 dark:bg-amber-950/30 dark:text-amber-100">
                    <p className="font-medium">{messages.bindings.latestError}</p>
                    <p className="mt-2 leading-6">{currentBinding.lastErrorMessage}</p>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState
                title={messages.bindings.emptyTitle}
                description={messages.bindings.emptyDescription}
              />
            )}
          </CardContent>
        </Card>

        {currentBinding ? (
          <>
            <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.22)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader>
                <CardTitle className="text-xl">{messages.bindings.profilesTitle}</CardTitle>
                <CardDescription>{messages.bindings.profilesDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <FormFeedback
                  state={
                    updateProfileState.error || updateProfileState.success
                      ? updateProfileState
                      : manualProfileState
                  }
                />
                {currentBinding.crawlProfiles.length > 0 ? (
                  <div className="space-y-4">
                    {currentBinding.crawlProfiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="rounded-[1.75rem] border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                                {messages.enums.crawlMode[profile.mode]}
                              </Badge>
                              <Badge
                                className={cn(
                                  "rounded-full",
                                  profile.enabled
                                    ? "bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]"
                                    : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/80",
                                )}
                              >
                                {profile.enabled
                                  ? messages.bindings.crawlEnabled
                                  : messages.bindings.crawlDisabled}
                              </Badge>
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">
                              {messages.bindings.profileRunSummary}{" "}
                              {messages.bindings.lastRunLabel}
                              {formatDateTime(profile.lastRunAt, locale, messages.common.notRecorded)}
                              {" · "}
                              {messages.bindings.nextRunLabel}
                              {formatDateTime(profile.nextRunAt, locale, messages.common.notScheduled)}
                            </p>
                          </div>
                        </div>

                        <form
                          key={`profile-${profile.id}`}
                          action={updateProfileAction}
                          className="mt-4 space-y-4"
                        >
                          <input type="hidden" name="bindingId" value={currentBinding.id} />
                          <input type="hidden" name="profileId" value={profile.id} />
                          <input type="hidden" name="mode" value={profile.mode} />

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <FieldLabel htmlFor={`interval-${profile.id}`}>
                                {messages.bindings.crawlIntervalLabel}
                              </FieldLabel>
                              <Input
                                id={`interval-${profile.id}`}
                                name="intervalMinutes"
                                type="number"
                                min={5}
                                max={1440}
                                defaultValue={String(profile.intervalMinutes)}
                                className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                              />
                            </div>
                            <div className="space-y-2">
                              <FieldLabel htmlFor={`max-posts-${profile.id}`}>
                                {messages.bindings.maxPostsLabel}
                              </FieldLabel>
                              <Input
                                id={`max-posts-${profile.id}`}
                                name="maxPosts"
                                type="number"
                                min={1}
                                max={200}
                                defaultValue={String(profile.maxPosts)}
                                className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <FieldLabel htmlFor={`query-${profile.id}`}>
                              {messages.bindings.queryTextLabel}
                            </FieldLabel>
                            <Input
                              id={`query-${profile.id}`}
                              name="queryText"
                              defaultValue={profile.queryText ?? ""}
                              disabled={profile.mode !== "SEARCH"}
                              placeholder={messages.bindings.queryTextPlaceholder}
                              className="h-11 rounded-2xl border-border/70 bg-white px-4 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10"
                            />
                          </div>

                          <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/10">
                            <div>
                              <p className="font-medium text-foreground">{messages.bindings.profileEnabledLabel}</p>
                              <p className="text-sm text-muted-foreground">
                                {messages.bindings.profileEnabledHint}
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              name="enabled"
                              defaultChecked={profile.enabled}
                              className="h-4 w-4 rounded border-border text-[#2d4d3f] focus:ring-[#2d4d3f] dark:border-white/20 dark:bg-white/10 dark:text-[#d8e2db] dark:focus:ring-[#d8e2db]"
                            />
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <Button
                              type="submit"
                              className="rounded-full bg-[#2d4d3f] px-5 hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
                              disabled={isUpdateProfilePending}
                            >
                              {isUpdateProfilePending
                                ? messages.bindings.savingProfile
                                : messages.bindings.saveProfile}
                            </Button>
                          </div>
                        </form>

                        <form
                          key={`profile-manual-${profile.id}`}
                          action={manualProfileAction}
                          className="mt-3"
                        >
                          <input type="hidden" name="bindingId" value={currentBinding.id} />
                          <input type="hidden" name="profileId" value={profile.id} />
                          <Button
                            type="submit"
                            variant="outline"
                            className="rounded-full px-5"
                            disabled={isManualProfilePending || currentBinding.status !== "ACTIVE"}
                          >
                            {isManualProfilePending
                              ? messages.bindings.triggeringNow
                              : messages.bindings.triggerProfileNow}
                          </Button>
                        </form>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title={messages.bindings.emptyProfilesTitle}
                    description={messages.bindings.emptyProfilesDescription}
                  />
                )}

                <div className="rounded-[1.75rem] border border-dashed border-border/70 bg-[#f8faf8] p-5 dark:border-white/10 dark:bg-white/8">
                  <h3 className="text-lg font-semibold text-foreground">
                    {messages.bindings.addProfileTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {messages.bindings.addProfileDescription}
                  </p>
                  <form
                    key={`profile-create-${currentBinding.id}`}
                    action={createProfileAction}
                    className="mt-4 space-y-4"
                  >
                    <input type="hidden" name="bindingId" value={currentBinding.id} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`new-profile-mode-${currentBinding.id}`}>
                          {messages.bindings.profileModeLabel}
                        </FieldLabel>
                        <select
                          id={`new-profile-mode-${currentBinding.id}`}
                          name="mode"
                          defaultValue="HOT"
                          className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
                        >
                          <option value="RECOMMENDED">
                            {messages.enums.crawlMode.RECOMMENDED}
                          </option>
                          <option value="HOT">{messages.enums.crawlMode.HOT}</option>
                          <option value="SEARCH">{messages.enums.crawlMode.SEARCH}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`new-profile-interval-${currentBinding.id}`}>
                          {messages.bindings.crawlIntervalLabel}
                        </FieldLabel>
                        <Input
                          id={`new-profile-interval-${currentBinding.id}`}
                          name="intervalMinutes"
                          type="number"
                          min={5}
                          max={1440}
                          defaultValue="60"
                          className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`new-profile-query-${currentBinding.id}`}>
                          {messages.bindings.queryTextLabel}
                        </FieldLabel>
                        <Input
                          id={`new-profile-query-${currentBinding.id}`}
                          name="queryText"
                          placeholder={messages.bindings.queryTextPlaceholder}
                          className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`new-profile-max-posts-${currentBinding.id}`}>
                          {messages.bindings.maxPostsLabel}
                        </FieldLabel>
                        <Input
                          id={`new-profile-max-posts-${currentBinding.id}`}
                          name="maxPosts"
                          type="number"
                          min={1}
                          max={200}
                          defaultValue="20"
                          className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/10">
                      <div>
                        <p className="font-medium text-foreground">{messages.bindings.profileEnabledLabel}</p>
                        <p className="text-sm text-muted-foreground">
                          {messages.bindings.profileEnabledHint}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        name="enabled"
                        defaultChecked
                        className="h-4 w-4 rounded border-border text-[#2d4d3f] focus:ring-[#2d4d3f] dark:border-white/20 dark:bg-white/10 dark:text-[#d8e2db] dark:focus:ring-[#d8e2db]"
                      />
                    </div>
                    <FormFeedback state={createProfileState} />
                    <Button
                      type="submit"
                      className="rounded-full bg-[#7f5a26] px-5 hover:bg-[#65471f] dark:bg-[#f2c58c] dark:text-[#2c2114] dark:hover:bg-[#e5b775]"
                      disabled={isCreateProfilePending}
                    >
                      {isCreateProfilePending
                        ? messages.bindings.addingProfile
                        : messages.bindings.addProfile}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.28)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader>
                <CardTitle className="text-xl">{messages.bindings.crawlConfigTitle}</CardTitle>
                <CardDescription>{messages.bindings.crawlConfigDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  key={`config-${currentBinding.id}`}
                  action={configAction}
                  className="space-y-5"
                >
                  <input type="hidden" name="bindingId" value={currentBinding.id} />
                  <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-[#f8faf8] px-4 py-3 dark:border-white/10 dark:bg-white/8">
                    <div>
                      <p className="font-medium text-foreground">{messages.bindings.autoCrawlTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {messages.bindings.autoCrawlDescription}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      name="crawlEnabled"
                      defaultChecked={currentBinding.crawlEnabled}
                      className="h-4 w-4 rounded border-border text-[#2d4d3f] focus:ring-[#2d4d3f] dark:border-white/20 dark:bg-white/10 dark:text-[#d8e2db] dark:focus:ring-[#d8e2db]"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="crawlIntervalMinutes">{messages.bindings.crawlIntervalLabel}</FieldLabel>
                    <Input
                      id="crawlIntervalMinutes"
                      name="crawlIntervalMinutes"
                      type="number"
                      min={5}
                      max={1440}
                      defaultValue={String(currentBinding.crawlIntervalMinutes)}
                      className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4 dark:border-white/10 dark:bg-white/8"
                    />
                  </div>
                  <FormFeedback state={configState} />
                  <Button
                    type="submit"
                    className="rounded-full bg-[#2d4d3f] px-5 hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
                    disabled={isConfigPending}
                  >
                    {isConfigPending ? messages.bindings.savingConfig : messages.bindings.saveConfig}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.2)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader>
                <CardTitle className="text-xl">{messages.bindings.operationsTitle}</CardTitle>
                <CardDescription>{messages.bindings.operationsDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  key={`manual-${currentBinding.id}`}
                  action={manualCrawlAction}
                  className="space-y-3"
                >
                  <input type="hidden" name="bindingId" value={currentBinding.id} />
                  <Button
                    type="submit"
                    className="rounded-full bg-[#7f5a26] px-5 hover:bg-[#65471f] dark:bg-[#f2c58c] dark:text-[#2c2114] dark:hover:bg-[#e5b775]"
                    disabled={isManualCrawlPending || currentBinding.status !== "ACTIVE"}
                  >
                    {isManualCrawlPending ? messages.bindings.triggeringNow : messages.bindings.triggerNow}
                  </Button>
                  <FormFeedback state={manualCrawlState} />
                </form>
                <form
                  key={`validate-${currentBinding.id}`}
                  action={validateAction}
                  className="space-y-3"
                >
                  <input type="hidden" name="bindingId" value={currentBinding.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    className="rounded-full px-5"
                    disabled={isValidatePending}
                  >
                    {isValidatePending ? messages.bindings.revalidating : messages.bindings.revalidate}
                  </Button>
                  <FormFeedback state={validateState} />
                </form>
                <form
                  key={`disable-${currentBinding.id}`}
                  action={disableAction}
                  className="space-y-3"
                >
                  <input type="hidden" name="bindingId" value={currentBinding.id} />
                  <Button
                    type="submit"
                    variant="destructive"
                    className="rounded-full px-5"
                    disabled={isDisablePending || currentBinding.status === "DISABLED"}
                  >
                    {isDisablePending ? messages.bindings.disabling : messages.bindings.disable}
                  </Button>
                  <FormFeedback state={disableState} />
                </form>
                <form
                  key={`unbind-${currentBinding.id}`}
                  action={unbindAction}
                  className="space-y-3"
                  onSubmit={handleUnbindSubmit}
                >
                  <input type="hidden" name="bindingId" value={currentBinding.id} />
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/25 dark:bg-red-950/30 dark:text-red-200">
                    {messages.bindings.unbindWarning}
                  </div>
                  <Button
                    type="submit"
                    variant="destructive"
                    className="rounded-full px-5"
                    disabled={isUnbindPending}
                  >
                    {isUnbindPending ? messages.bindings.unbinding : messages.bindings.unbind}
                  </Button>
                  <FormFeedback state={unbindState} />
                </form>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <div className="space-y-6">
        <Card className="rounded-[2rem] border-border/70 bg-white/95 shadow-[0_24px_80px_-40px_rgba(31,49,40,0.3)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
          <CardHeader>
            <CardTitle className="text-2xl">{messages.bindings.browserAssistTitle}</CardTitle>
            <CardDescription className="leading-6">
              {currentBinding
                ? messages.bindings.browserAssistDescriptionBound
                : messages.bindings.browserAssistDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {browserDesktopUrl ? (
              <div className="rounded-2xl border border-[#c7b08a]/40 bg-[#f5efe4] px-4 py-3 text-sm text-[#6c4c1f] dark:border-[#f2c58c]/20 dark:bg-[#3d3124] dark:text-[#f8ddb5]">
                {messages.bindings.browserRemoteDesktopNotice}
              </div>
            ) : null}
            <div className="rounded-[1.75rem] border border-border/70 bg-[linear-gradient(135deg,#f5efe4,rgba(238,244,240,0.88))] p-5 dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(61,49,36,0.96),rgba(34,50,40,0.92))]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#7f5a26] dark:text-[#f2c58c]">{messages.bindings.browserFlowTitle}</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {browserSession
                      ? messages.enums.browserSessionStatus[browserSession.status]
                      : messages.bindings.startBrowserBinding}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {messages.bindings.browserFlowDescription}
                  </p>
                </div>
                {browserSession ? (
                  <Badge
                    className={cn(
                      "rounded-full",
                      getBrowserSessionBadgeClassName(browserSession.status),
                    )}
                  >
                    {messages.enums.browserSessionStatus[browserSession.status]}
                  </Badge>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                <p>{messages.bindings.browserStep1}</p>
                <p>{messages.bindings.browserStep2}</p>
                <p>{messages.bindings.browserStep3}</p>
              </div>
            </div>

            {browserSession ? (
              <div className="rounded-[1.75rem] border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {messages.bindings.sessionId}
                    </p>
                    <p className="mt-2 font-mono text-sm text-foreground">{browserSession.id}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {messages.bindings.sessionExpiresAt}
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {formatDateTime(browserSession.expiresAt, locale, messages.common.notRecorded)}
                    </p>
                  </div>
                </div>

                {browserSession.username ? (
                  <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-foreground dark:bg-white/10">
                    <p className="font-medium">
                      @{browserSession.username}
                      {browserSession.displayName ? ` · ${browserSession.displayName}` : ""}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {browserSession.xUserId ?? messages.bindings.fillingUserId}
                    </p>
                  </div>
                ) : null}

                {browserSession.status === "SUCCESS" ? (
                  <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100">
                    {messages.bindings.browserSuccess}
                  </div>
                ) : null}

                {browserSession.errorMessage ? (
                  <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                    {browserSession.errorMessage}
                  </div>
                ) : null}
              </div>
            ) : null}

            {browserSessionError ? (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-200">
                {browserSessionError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                className="rounded-full bg-[#2d4d3f] px-5 hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
                disabled={isBrowserSessionPending && !browserSession}
                onClick={handleStartBrowserBinding}
              >
                {isBrowserSessionPending && !browserSession
                  ? messages.bindings.startingBrowserBinding
                  : browserSession && isBrowserSessionActive(browserSession.status)
                    ? messages.bindings.startBrowserBindingAgain
                    : messages.bindings.startBrowserBinding}
              </Button>
              {browserSession && isBrowserSessionActive(browserSession.status) ? (
                browserDesktopUrl ? (
                  <a
                    href={browserDesktopUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-white px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
                  >
                    {messages.bindings.openBrowserDesktop}
                  </a>
                ) : null
              ) : null}
              {browserSession && isBrowserSessionActive(browserSession.status) ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full px-5"
                  disabled={isBrowserSessionPending}
                  onClick={handleCancelBrowserBinding}
                >
                  {messages.bindings.cancelBrowserBinding}
                </Button>
              ) : null}
              {browserSession?.status === "SUCCESS" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full px-5"
                  onClick={() => router.refresh()}
                >
                  {messages.bindings.refreshBindingState}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/70 bg-white/95 shadow-[0_24px_80px_-40px_rgba(31,49,40,0.22)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
          <CardHeader>
            <CardTitle className="text-2xl">{messages.bindings.advancedTitle}</CardTitle>
            <CardDescription className="leading-6">
              {messages.bindings.advancedDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              key={`upsert-${currentBinding?.id ?? "new"}`}
              action={upsertAction}
              className="space-y-5"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel htmlFor="xUserId">{messages.bindings.xUserId}</FieldLabel>
                  <Input
                    id="xUserId"
                    name="xUserId"
                    defaultValue={currentBinding?.xUserId ?? ""}
                    placeholder={messages.bindings.placeholders.xUserId}
                    className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4 dark:border-white/10 dark:bg-white/8"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="username">{messages.bindings.username}</FieldLabel>
                  <Input
                    id="username"
                    name="username"
                    defaultValue={currentBinding?.username ?? ""}
                    placeholder={messages.bindings.placeholders.username}
                    className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4 dark:border-white/10 dark:bg-white/8"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel htmlFor="displayName">{messages.bindings.displayName}</FieldLabel>
                  <Input
                    id="displayName"
                    name="displayName"
                    defaultValue={currentBinding?.displayName ?? ""}
                    placeholder={messages.bindings.placeholders.displayName}
                    className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4 dark:border-white/10 dark:bg-white/8"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="avatarUrl">{messages.bindings.avatarUrl}</FieldLabel>
                  <Input
                    id="avatarUrl"
                    name="avatarUrl"
                    defaultValue={currentBinding?.avatarUrl ?? ""}
                    placeholder="https://..."
                    className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4 dark:border-white/10 dark:bg-white/8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="credentialSource">{messages.bindings.credentialSourceLabel}</FieldLabel>
                <select
                  id="credentialSource"
                  name="credentialSource"
                  defaultValue={currentBinding?.credentialSource ?? "WEB_LOGIN"}
                  className="h-11 w-full rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 text-sm text-foreground outline-none ring-0 transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/8"
                >
                  {credentialSourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="credentialPayload">{messages.bindings.credentialPayload}</FieldLabel>
                <textarea
                  id="credentialPayload"
                  name="credentialPayload"
                  rows={8}
                  placeholder={messages.bindings.placeholders.credentialPayload}
                  className="w-full rounded-[1.5rem] border border-border/70 bg-[#fcfaf5] px-4 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/8"
                />
                <p className="text-sm leading-6 text-muted-foreground">
                  {messages.bindings.credentialPayloadHint}
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-[1fr_220px]">
                <div className="flex items-center justify-between rounded-[1.5rem] border border-border/70 bg-[#f8faf8] px-4 py-3 dark:border-white/10 dark:bg-white/8">
                  <div>
                    <p className="font-medium text-foreground">{messages.bindings.enableAutoCrawlAfterSave}</p>
                    <p className="text-sm text-muted-foreground">{messages.bindings.enableAutoCrawlAfterSaveHint}</p>
                  </div>
                  <input
                    type="checkbox"
                    name="crawlEnabled"
                    defaultChecked={currentBinding?.crawlEnabled ?? true}
                    className="h-4 w-4 rounded border-border text-[#2d4d3f] focus:ring-[#2d4d3f] dark:border-white/20 dark:bg-white/10 dark:text-[#d8e2db] dark:focus:ring-[#d8e2db]"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="bindingCrawlIntervalMinutes">{messages.bindings.crawlIntervalLabel}</FieldLabel>
                  <Input
                    id="bindingCrawlIntervalMinutes"
                    name="crawlIntervalMinutes"
                    type="number"
                    min={5}
                    max={1440}
                    defaultValue={String(currentBinding?.crawlIntervalMinutes ?? 60)}
                    className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4 dark:border-white/10 dark:bg-white/8"
                  />
                </div>
              </div>

              <FormFeedback state={upsertState} />
              <Button
                type="submit"
                className="rounded-full bg-[#2d4d3f] px-5 hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
                disabled={isUpserting}
              >
                {isUpserting
                  ? messages.bindings.submitting
                  : currentBinding
                    ? messages.bindings.update
                    : messages.bindings.submit}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
