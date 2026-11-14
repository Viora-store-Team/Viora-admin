"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import Toggle from "@/components/ui/Toggle";
import { createSize, fetchSizes } from "@/lib/admin/api";
import {
  type AdminSize,
  type CategorySizesPayload,
  type SizeGroup,
} from "@/lib/admin/types";
import { classifyStatus } from "@/lib/apiFailure";
import { cn } from "@/lib/cn";
import { t } from "@/lib/strings";

/** القيمة: الترتيب هو ترتيب `sizeIds`. noSizes يلغي الاختيار */
export interface PickerValue {
  noSizes: boolean;
  sizeIds: number[];
}

export const EMPTY_PICKER: PickerValue = { noSizes: false, sizeIds: [] };

export function isPickerValid(value: PickerValue): boolean {
  return value.noSizes || value.sizeIds.length > 0;
}

export function toSizesPayload(value: PickerValue): CategorySizesPayload {
  return value.noSizes ? { noSizes: true } : { sizeIds: value.sizeIds };
}

interface Props {
  value: PickerValue;
  onChange: (value: PickerValue) => void;
  disabled?: boolean;
  error?: string;
}

export default function CategorySizesPicker({ value, onChange, disabled = false, error }: Props) {
  const [library, setLibrary] = useState<AdminSize[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  /* آخر قيمة — addSize بيرجع بعد await فما بيعتمد على الـ closure القديم */
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  });
  /* الاختيار قبل تشغيل «بدون مقاس» عشان نرجّعه لو انطفى */
  const savedIdsRef = useRef<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchSizes();
      if (cancelled) return;
      if (res.success && res.sizes) {
        setLibrary(res.sizes);
        return;
      }
      setLoadError(classifyStatus(res).message || t.admin.categories.sizesLoadFailed);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* المؤرشف ما بينعرض إلا لو كان مختار (عشان يقدر الأدمن يشيله) */
  const visible = useMemo(
    () =>
      (library ?? []).filter(
        (size) => size.slug !== "one-size" && (size.isActive || value.sizeIds.includes(size.id)),
      ),
    [library, value.sizeIds],
  );
  const byGroup = useMemo(() => {
    const groups = new Map<SizeGroup, AdminSize[]>();
    for (const size of visible) {
      groups.set(size.sizeGroup, [...(groups.get(size.sizeGroup) ?? []), size]);
    }
    return groups;
  }, [visible]);
  const byId = useMemo(() => new Map((library ?? []).map((size) => [size.id, size])), [library]);

  const toggle = (id: number) => {
    onChange({
      noSizes: false,
      sizeIds: value.sizeIds.includes(id)
        ? value.sizeIds.filter((x) => x !== id)
        : [...value.sizeIds, id],
    });
  };

  const move = (index: number, delta: -1 | 1) => {
    const next = [...value.sizeIds];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ noSizes: false, sizeIds: next });
  };

  /* يضيف المقاس للاختيار (لو مش مختار أصلًا) */
  const select = (id: number) => {
    const latest = valueRef.current;
    if (latest.sizeIds.includes(id)) return;
    onChange({ noSizes: false, sizeIds: [...latest.sizeIds, id] });
  };

  /* الاسم حر (أرقام/حروف/أي نص) — لو موجود بالمكتبة بنختاره بدل ما ننشئ نسخة */
  const addSize = async () => {
    const name = newName.trim();
    if (!name) return;
    setAddError("");
    const existing = (library ?? []).find(
      (size) => size.isActive && size.slug !== "one-size" && size.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      select(existing.id);
      setNewName("");
      return;
    }
    setAdding(true);
    const res = await createSize({ name });
    setAdding(false);
    if (res.success && res.size) {
      const created = res.size;
      setLibrary((prev) => [...(prev ?? []), created]);
      setNewName("");
      select(created.id);
      return;
    }
    /* موجود بس مؤرشف أو مش محمّل عنّا: السيرفر بيرجّعه بالـ 409 */
    const taken = res.size;
    if (res.status === 409 && taken?.isActive) {
      setNewName("");
      select(taken.id);
      return;
    }
    setAddError(classifyStatus(res).message);
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-bold text-heading">{t.admin.categories.sizes}</p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          {t.admin.categories.sizesHint}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/40 px-3 py-2.5">
        <div>
          <p className="text-xs font-bold text-heading">{t.admin.categories.noSizes}</p>
          <p className="text-[11px] text-text-secondary">{t.admin.categories.noSizesHint}</p>
        </div>
        <Toggle
          checked={value.noSizes}
          onChange={(checked) => {
            if (checked) {
              savedIdsRef.current = value.sizeIds;
              onChange({ noSizes: true, sizeIds: [] });
            } else {
              onChange({ noSizes: false, sizeIds: savedIdsRef.current });
            }
          }}
          label={t.admin.categories.noSizes}
          disabled={disabled}
        />
      </div>

      {!value.noSizes && (
        <>
          {library === null && !loadError && (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Spinner variant="inline" className="size-4" />
              {t.admin.categories.sizesLoading}
            </div>
          )}
          {loadError && <p className="text-xs text-danger">{loadError}</p>}

          {[...byGroup.entries()].map(([group, sizes]) => (
            <fieldset key={group} className="space-y-1.5">
              <legend className="text-[11px] font-bold text-text-secondary">
                {t.admin.sizeGroups[group]}
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {sizes.map((size) => {
                  const selected = value.sizeIds.includes(size.id);
                  return (
                    <Button
                      key={size.id}
                      variant="secondary"
                      size="sm"
                      aria-pressed={selected}
                      disabled={disabled}
                      onClick={() => toggle(size.id)}
                      className={cn(
                        "ltr-nums min-w-10 rounded-xl border px-2.5 text-xs font-bold transition-colors duration-150",
                        selected
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border bg-surface text-text-secondary hover:border-primary/50",
                        !size.isActive && "opacity-60 line-through",
                      )}
                    >
                      {size.name}
                    </Button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {value.sizeIds.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-bold text-text-secondary">
                {t.admin.categories.sizeOrder}
              </p>
              <ol className="space-y-1">
                {value.sizeIds.map((id, index) => (
                  <li
                    key={id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5"
                  >
                    <span className="ltr-nums flex-1 text-xs font-bold text-heading">
                      {byId.get(id)?.name ?? id}
                    </span>
                    <IconButton label={t.admin.categories.moveUp} icon={<ArrowUp className="size-4" aria-hidden="true" />} variant="ghost" size="sm" disabled={disabled || index === 0} onClick={() => move(index, -1)} />
                    <IconButton label={t.admin.categories.moveDown} icon={<ArrowDown className="size-4" aria-hidden="true" />} variant="ghost" size="sm" disabled={disabled || index === value.sizeIds.length - 1} onClick={() => move(index, 1)} />
                    <IconButton label={t.admin.categories.removeSize} icon={<X className="size-4" aria-hidden="true" />} variant="ghost" size="sm" disabled={disabled} onClick={() => toggle(id)} className="text-danger" />
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="rounded-xl border border-dashed border-border p-3">
            <p className="mb-2 text-xs font-bold text-heading">{t.admin.categories.addSize}</p>
            <p className="mb-2 text-[11px] text-text-secondary">{t.admin.categories.newSizeHint}</p>
            <div
              className="grid grid-cols-[1fr_auto] gap-2"
              onKeyDown={(event) => {
                if (event.key === "Enter" && newName.trim() && !adding) {
                  event.preventDefault();
                  void addSize();
                }
              }}
            >
              <Input
                id="new-size-name"
                value={newName}
                onChange={setNewName}
                placeholder={t.admin.categories.newSizeName}
                disabled={disabled || adding}
                maxLength={50}
              />
              <Button
                variant="secondary"
                onClick={addSize}
                disabled={disabled || adding || !newName.trim()}
                icon={<Plus className="size-4" aria-hidden="true" />}
              >
                {t.admin.categories.newSizeAdd}
              </Button>
            </div>
            {addError && <p className="mt-1.5 text-xs text-danger">{addError}</p>}
          </div>
        </>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
