import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  ApiRequestError,
  apiRequestWithUser,
  getApiErrorMessage,
} from "@/lib/api-client";
import { getRequestLocale, getRequestMessages } from "@/lib/request-locale";
import type { ReportDetailRecord } from "@/app/reports/report-types";
import {
  buildReportExportContent,
  buildReportExportFilename,
  getReportExportMimeType,
  isReportExportFormat,
} from "@/app/reports/report-export";

type ExportRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: ExportRouteProps) {
  const { messages } = await getRequestMessages();
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: messages.actions.api.unauthorized },
      { status: 401 },
    );
  }

  const format = new URL(request.url).searchParams.get("format");

  if (!isReportExportFormat(format)) {
    return NextResponse.json(
      { error: messages.actions.reports.invalidExportFormat },
      { status: 400 },
    );
  }

  try {
    const { id } = await params;
    const locale = await getRequestLocale();
    const report = await apiRequestWithUser<ReportDetailRecord>(
      {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
      {
        path: `/reports/${id}`,
        method: "GET",
      },
    );
    const content = buildReportExportContent(report, format, locale);
    const fileName = buildReportExportFilename(report, format);

    return new NextResponse(content, {
      headers: {
        "content-type": getReportExportMimeType(format),
        "content-disposition": `attachment; filename="report-${report.id.slice(
          0,
          8,
        )}.${format}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 500;

    return NextResponse.json(
      {
        error: getApiErrorMessage(error, messages.actions.api.requestFailed),
      },
      { status },
    );
  }
}
