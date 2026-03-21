import { getMessages, type Locale } from "@/lib/i18n";
import type { ReportDetailRecord } from "./report-types";
import {
  extractReportBodyText,
  extractReportSummary,
  formatReportDate,
  formatReportPeriod,
} from "./report-utils";

export type ReportExportFormat = "md" | "html" | "txt";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildBodyHtml(report: ReportDetailRecord) {
  if (report.renderedHtml && report.renderedHtml.trim().length > 0) {
    return report.renderedHtml;
  }

  const bodyText = extractReportBodyText(report.richTextJson).trim();

  if (bodyText.length === 0) {
    return "<p></p>";
  }

  return bodyText
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

function buildSourcePostsMarkdown(report: ReportDetailRecord, locale: Locale) {
  return report.sourcePosts
    .map(
      (item, index) =>
        `${index + 1}. @${item.archivedPost.authorUsername} · ${formatReportDate(
          item.archivedPost.sourceCreatedAt,
          locale,
        )}\n${item.archivedPost.rawText}\n${item.archivedPost.postUrl}`,
    )
    .join("\n\n");
}

function buildSourcePostsText(report: ReportDetailRecord, locale: Locale) {
  return report.sourcePosts
    .map(
      (item, index) =>
        `${index + 1}. @${item.archivedPost.authorUsername} · ${formatReportDate(
          item.archivedPost.sourceCreatedAt,
          locale,
        )}\n${item.archivedPost.rawText}\n${item.archivedPost.postUrl}`,
    )
    .join("\n\n");
}

function buildSourcePostsHtml(report: ReportDetailRecord, locale: Locale) {
  if (report.sourcePosts.length === 0) {
    return "<p></p>";
  }

  return `
    <ol>
      ${report.sourcePosts
        .map(
          (item) => `
            <li>
              <p><strong>@${escapeHtml(item.archivedPost.authorUsername)}</strong> · ${escapeHtml(
                formatReportDate(item.archivedPost.sourceCreatedAt, locale),
              )}</p>
              <p>${escapeHtml(item.archivedPost.rawText)}</p>
              <p><a href="${escapeHtml(item.archivedPost.postUrl)}">${escapeHtml(
                item.archivedPost.postUrl,
              )}</a></p>
            </li>
          `,
        )
        .join("")}
    </ol>
  `;
}

export function isReportExportFormat(
  value: string | null | undefined,
): value is ReportExportFormat {
  return value === "md" || value === "html" || value === "txt";
}

export function getReportExportMimeType(format: ReportExportFormat) {
  if (format === "md") {
    return "text/markdown; charset=utf-8";
  }

  if (format === "html") {
    return "text/html; charset=utf-8";
  }

  return "text/plain; charset=utf-8";
}

export function getReportExportExtension(format: ReportExportFormat) {
  if (format === "md") {
    return "md";
  }

  if (format === "html") {
    return "html";
  }

  return "txt";
}

export function buildReportExportFilename(
  report: Pick<ReportDetailRecord, "id" | "title">,
  format: ReportExportFormat,
) {
  const baseName = report.title.trim().length > 0 ? report.title.trim() : `report-${report.id.slice(0, 8)}`;
  const safeBaseName = baseName
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);

  return `${safeBaseName || `report-${report.id.slice(0, 8)}`}.${getReportExportExtension(format)}`;
}

export function buildReportExportContent(
  report: ReportDetailRecord,
  format: ReportExportFormat,
  locale: Locale,
) {
  const messages = getMessages(locale);
  const summary = extractReportSummary(
    report.summaryJson,
    messages.reportDetail.noSummary,
  );
  const bodyText = extractReportBodyText(report.richTextJson).trim();
  const period = formatReportPeriod(report.periodStart, report.periodEnd, locale);
  const createdAt = formatReportDate(report.createdAt, locale);
  const updatedAt = formatReportDate(report.updatedAt, locale);
  const sourcePostCount = report.sourcePosts.length;

  if (format === "md") {
    return [
      `# ${report.title}`,
      "",
      `- ${messages.reports.form.reportTypeLabel}: ${messages.enums.reportType[report.reportType]}`,
      `- ${messages.enums.reportStatus[report.status]}`,
      `- ${messages.reportDetail.periodLabel}: ${period}`,
      `- ${messages.reportDetail.createdAtLabel}: ${createdAt}`,
      `- ${messages.reportDetail.updatedAtLabel}: ${updatedAt}`,
      `- ${messages.reportDetail.sourcePostsCountLabel}: ${sourcePostCount}`,
      "",
      `## ${messages.reportDetail.summaryTitle}`,
      "",
      summary,
      "",
      `## ${messages.reportDetail.bodyLabel}`,
      "",
      bodyText.length > 0 ? bodyText : messages.reportDetail.noSummary,
      "",
      `## ${messages.reportDetail.sourcePostsTitle}`,
      "",
      sourcePostCount > 0
        ? buildSourcePostsMarkdown(report, locale)
        : messages.reportDetail.emptySourcePostsDescription,
      "",
    ].join("\n");
  }

  if (format === "txt") {
    return [
      report.title,
      "",
      `${messages.reports.form.reportTypeLabel}: ${messages.enums.reportType[report.reportType]}`,
      `${messages.reportDetail.periodLabel}: ${period}`,
      `${messages.reportDetail.createdAtLabel}: ${createdAt}`,
      `${messages.reportDetail.updatedAtLabel}: ${updatedAt}`,
      `${messages.reportDetail.sourcePostsCountLabel}: ${sourcePostCount}`,
      "",
      `${messages.reportDetail.summaryTitle}`,
      `${summary}`,
      "",
      `${messages.reportDetail.bodyLabel}`,
      `${bodyText.length > 0 ? bodyText : messages.reportDetail.noSummary}`,
      "",
      `${messages.reportDetail.sourcePostsTitle}`,
      `${
        sourcePostCount > 0
          ? buildSourcePostsText(report, locale)
          : messages.reportDetail.emptySourcePostsDescription
      }`,
      "",
    ].join("\n");
  }

  return `<!doctype html>
<html lang="${locale === "zh-CN" ? "zh-CN" : "en"}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(report.title)}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 40px auto; max-width: 920px; color: #1f2937; line-height: 1.7; padding: 0 24px; }
      h1, h2 { color: #111827; }
      .meta { margin: 24px 0; padding: 20px 24px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 16px; }
      .summary, .body, .sources { margin-top: 28px; }
      .summary, .sources { padding: 20px 24px; background: #fcfcfd; border: 1px solid #e5e7eb; border-radius: 16px; }
      a { color: #0f766e; }
      figure, img, video { max-width: 100%; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(report.title)}</h1>
    <div class="meta">
      <p><strong>${escapeHtml(messages.reports.form.reportTypeLabel)}:</strong> ${escapeHtml(
        messages.enums.reportType[report.reportType],
      )}</p>
      <p><strong>${escapeHtml(messages.reportDetail.periodLabel)}:</strong> ${escapeHtml(period)}</p>
      <p><strong>${escapeHtml(messages.reportDetail.createdAtLabel)}:</strong> ${escapeHtml(createdAt)}</p>
      <p><strong>${escapeHtml(messages.reportDetail.updatedAtLabel)}:</strong> ${escapeHtml(updatedAt)}</p>
      <p><strong>${escapeHtml(messages.reportDetail.sourcePostsCountLabel)}:</strong> ${sourcePostCount}</p>
    </div>
    <section class="summary">
      <h2>${escapeHtml(messages.reportDetail.summaryTitle)}</h2>
      <p>${escapeHtml(summary)}</p>
    </section>
    <section class="body">
      <h2>${escapeHtml(messages.reportDetail.bodyLabel)}</h2>
      ${buildBodyHtml(report)}
    </section>
    <section class="sources">
      <h2>${escapeHtml(messages.reportDetail.sourcePostsTitle)}</h2>
      ${
        sourcePostCount > 0
          ? buildSourcePostsHtml(report, locale)
          : `<p>${escapeHtml(messages.reportDetail.emptySourcePostsDescription)}</p>`
      }
    </section>
  </body>
</html>`;
}
