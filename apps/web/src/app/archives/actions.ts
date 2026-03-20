"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { getRequestMessages } from "@/lib/request-locale";

export type ArchiveTaxonomyActionState = {
  error?: string;
  success?: string;
};

function getOptionalTextValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : undefined;
}

export async function updateArchiveTaxonomyAction(
  _previousState: ArchiveTaxonomyActionState,
  formData: FormData,
): Promise<ArchiveTaxonomyActionState> {
  const { messages } = await getRequestMessages();
  const schema = z.object({
    archiveId: z
      .string()
      .trim()
      .min(1, messages.actions.archives.missingArchiveId),
    primaryCategoryId: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((value) => {
        if (typeof value !== "string") {
          return null;
        }

        const trimmed = value.trim();

        return trimmed.length > 0 ? trimmed : null;
      }),
    tagIds: z
      .array(z.string().trim())
      .transform((value) => value.filter((item) => item.length > 0)),
  });

  const parsed = schema.safeParse({
    archiveId: getOptionalTextValue(formData, "archiveId"),
    primaryCategoryId: getOptionalTextValue(formData, "primaryCategoryId"),
    tagIds: formData
      .getAll("tagIds")
      .filter((value): value is string => typeof value === "string"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.archives.taxonomyValidationFailed,
    } satisfies ArchiveTaxonomyActionState;
  }

  try {
    await apiRequest({
      path: `/archives/${parsed.data.archiveId}/taxonomy`,
      method: "PATCH",
      body: JSON.stringify({
        primaryCategoryId: parsed.data.primaryCategoryId,
        tagIds: parsed.data.tagIds,
      }),
    });

    revalidatePath("/archives");
    revalidatePath(`/archives/${parsed.data.archiveId}`);

    return {
      success: messages.actions.archives.taxonomyUpdated,
    } satisfies ArchiveTaxonomyActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.archives.taxonomyValidationFailed,
      ),
    } satisfies ArchiveTaxonomyActionState;
  }
}
