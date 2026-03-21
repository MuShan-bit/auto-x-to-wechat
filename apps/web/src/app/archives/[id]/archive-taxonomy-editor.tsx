"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  type ArchiveTaxonomyActionState,
  updateArchiveTaxonomyAction,
} from "../actions";
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
import { getMessages, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type TaxonomyOption = {
  color: string | null;
  id: string;
  isActive: boolean;
  name: string;
};

export type ArchiveTagAssignment = {
  id: string;
  source: "MANUAL" | "AI" | "RULE";
  tag: TaxonomyOption;
};

type ArchiveTaxonomyEditorProps = {
  archiveId: string;
  categories: TaxonomyOption[];
  loadError?: string | null;
  locale: Locale;
  primaryCategory: TaxonomyOption | null;
  primaryCategoryLocked: boolean;
  tagAssignments: ArchiveTagAssignment[];
  tagAssignmentsLocked: boolean;
  tags: TaxonomyOption[];
};

const initialState: ArchiveTaxonomyActionState = {};

function renderTagChips(tags: TaxonomyOption[], emptyText: string) {
  if (tags.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]"
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}

export function ArchiveTaxonomyEditor({
  archiveId,
  categories,
  loadError,
  locale,
  primaryCategory,
  primaryCategoryLocked,
  tagAssignments,
  tagAssignmentsLocked,
  tags,
}: ArchiveTaxonomyEditorProps) {
  const messages = getMessages(locale);
  const [state, formAction, isPending] = useActionState(
    updateArchiveTaxonomyAction,
    initialState,
  );
  const visibleTagAssignments = Array.from(
    new Map(
      tagAssignments.map((assignment) => [assignment.tag.id, assignment]),
    ).values(),
  );
  const currentTags = visibleTagAssignments.map((assignment) => assignment.tag);
  const currentTagIdSet = new Set(currentTags.map((tag) => tag.id));
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const [tagSearchKeyword, setTagSearchKeyword] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    Array.from(currentTagIdSet),
  );
  const selectedTagIdSet = useMemo(
    () => new Set(selectedTagIds),
    [selectedTagIds],
  );
  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIdSet.has(tag.id)),
    [selectedTagIdSet, tags],
  );
  const filteredTags = useMemo(() => {
    const normalizedKeyword = tagSearchKeyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return tags;
    }

    return tags.filter((tag) =>
      tag.name.toLowerCase().includes(normalizedKeyword),
    );
  }, [tagSearchKeyword, tags]);

  function toggleTagSelection(tagId: string) {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((item) => item !== tagId)
        : [...current, tagId],
    );
  }

  return (
    <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
      <CardHeader className="gap-3">
        <CardTitle className="text-2xl">
          {messages.archiveDetail.taxonomyTitle}
        </CardTitle>
        <CardDescription className="leading-6">
          {messages.archiveDetail.taxonomyDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-4 rounded-3xl bg-[#fcfaf5] p-5 dark:bg-[#161b17]">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {messages.archiveDetail.currentCategoryLabel}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {primaryCategory ? (
                <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                  {primaryCategory.name}
                </Badge>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {messages.archiveDetail.noPrimaryCategory}
                </p>
              )}
              {primaryCategoryLocked ? (
                <Badge className="rounded-full border border-[#2d4d3f]/15 bg-[#f1f6f3] text-[#2d4d3f] dark:border-[#d8e2db]/20 dark:bg-[#1c2520] dark:text-[#d8e2db]">
                  {messages.archiveDetail.lockBadge}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {messages.archiveDetail.currentTagsLabel}
              </p>
              {tagAssignmentsLocked ? (
                <Badge className="rounded-full border border-[#2d4d3f]/15 bg-[#f1f6f3] text-[#2d4d3f] dark:border-[#d8e2db]/20 dark:bg-[#1c2520] dark:text-[#d8e2db]">
                  {messages.archiveDetail.lockBadge}
                </Badge>
              ) : null}
            </div>
            {renderTagChips(currentTags, messages.archiveDetail.noTags)}
          </div>
        </div>

        {loadError ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-200">
            {loadError}
          </div>
        ) : null}

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="archiveId" value={archiveId} />
          {selectedTagIds.map((tagId) => (
            <input key={tagId} type="hidden" name="tagIds" value={tagId} />
          ))}

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="primaryCategoryId"
            >
              {messages.archiveDetail.primaryCategoryLabel}
            </label>
            <select
              id="primaryCategoryId"
              name="primaryCategoryId"
              defaultValue={primaryCategory?.id ?? ""}
              className="h-11 w-full rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 text-sm text-foreground outline-none transition-colors focus:border-[#2d4d3f] dark:border-white/10 dark:bg-white/8 dark:focus:border-[#d8e2db]"
            >
              <option value="">{messages.archiveDetail.chooseCategory}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {messages.archiveDetail.tagsFieldLabel}
              </p>
              <p className="text-sm text-muted-foreground">
                {messages.archiveDetail.taxonomyEditorHint}
              </p>
            </div>
            {tags.length > 0 ? (
              <div className="space-y-3">
                <Button
                  aria-expanded={isTagPickerOpen}
                  className="h-auto w-full justify-between rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3 text-left text-sm font-normal text-foreground hover:border-[#2d4d3f] hover:bg-[#fcfaf5] dark:border-white/10 dark:bg-white/8 dark:hover:border-[#d8e2db] dark:hover:bg-white/8"
                  onClick={() => setIsTagPickerOpen((current) => !current)}
                  type="button"
                  variant="outline"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium text-foreground">
                      {selectedTags.length > 0
                        ? messages.archiveDetail.selectedTagsCount.replace(
                            "{count}",
                            String(selectedTags.length),
                          )
                        : messages.archiveDetail.chooseTags}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {selectedTags.length > 0
                        ? selectedTags.map((tag) => tag.name).join(" / ")
                        : messages.archiveDetail.tagPickerHint}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      isTagPickerOpen ? "rotate-180" : "",
                    )}
                  />
                </Button>

                {selectedTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <button
                        key={tag.id}
                        className="inline-flex items-center gap-1 rounded-full bg-[#eef4f0] px-3 py-1 text-xs text-[#2d4d3f] transition-colors hover:bg-[#dfeae3] dark:bg-[#223228] dark:text-[#d8e2db] dark:hover:bg-[#2b3f33]"
                        onClick={() => toggleTagSelection(tag.id)}
                        type="button"
                      >
                        <span>{tag.name}</span>
                        <X className="size-3" />
                      </button>
                    ))}
                  </div>
                ) : null}

                {isTagPickerOpen ? (
                  <div className="space-y-3 rounded-2xl border border-border/70 bg-[#fcfaf5] p-3 dark:border-white/10 dark:bg-white/8">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="h-10 rounded-xl border-border/70 bg-white pl-9 dark:border-white/10 dark:bg-[#101511]"
                        onChange={(event) =>
                          setTagSearchKeyword(event.currentTarget.value)
                        }
                        placeholder={
                          messages.archiveDetail.searchTagsPlaceholder
                        }
                        value={tagSearchKeyword}
                      />
                    </div>

                    <div className="max-h-72 overflow-y-auto rounded-xl border border-border/70 bg-white dark:border-white/10 dark:bg-[#101511]">
                      {filteredTags.length > 0 ? (
                        <div className="divide-y divide-border/60 dark:divide-white/10">
                          {filteredTags.map((tag) => {
                            const isSelected = selectedTagIdSet.has(tag.id);

                            return (
                              <button
                                key={tag.id}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-[#f3eee4] dark:hover:bg-white/8"
                                onClick={() => toggleTagSelection(tag.id)}
                                type="button"
                              >
                                <span
                                  className={cn(
                                    "flex size-5 items-center justify-center rounded-md border border-border/70 bg-white dark:border-white/10 dark:bg-transparent",
                                    isSelected
                                      ? "border-[#2d4d3f] bg-[#2d4d3f] text-white dark:border-[#d8e2db] dark:bg-[#d8e2db] dark:text-[#18201b]"
                                      : "text-transparent",
                                  )}
                                >
                                  <Check className="size-3.5" />
                                </span>
                                <span className="flex-1">{tag.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-4 py-6 text-sm text-muted-foreground">
                          {messages.archiveDetail.noMatchingTags}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-[#fcfaf5] px-4 py-3 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/8">
                {messages.archiveDetail.noTagOptions}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {messages.archiveDetail.taxonomyLockHint}
            </p>
          </div>

          {state.error ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-200">
              {state.error}
            </div>
          ) : null}
          {state.success ? (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100">
              {state.success}
            </div>
          ) : null}

          <Button
            className="h-11 rounded-full bg-[#2d4d3f] px-5 text-white hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
            disabled={isPending || Boolean(loadError)}
            type="submit"
          >
            {isPending
              ? messages.archiveDetail.saveTaxonomyPending
              : messages.archiveDetail.saveTaxonomy}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
