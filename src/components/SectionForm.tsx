"use client";

import { useMemo } from "react";
import { Field } from "./Field";
import { useAutosave } from "./useAutosave";
import type { SectionDef } from "@/lib/config/sections";
import {
  TEF3071_CHECKLIST,
  TEF3071_RAMP_COLUMNS,
  TEF3071_RAMP_POSITIONS,
  TEF3071_WORK_TYPES,
  TEF3207_CWR_CONDITIONS,
  TEF3207_JOINTED_CONDITIONS,
  TEF3207_TICK_GROUPS,
  OPTIONS,
} from "@/lib/config/fields";
import type { FieldValue, SectionValues, ValidationIssue } from "@/lib/domain/validation";

interface Props {
  packId: string;
  section: SectionDef;
  siteNumber?: number;
  initialValues: SectionValues;
  packVersion: number;
  canEdit: boolean;
  issues: ValidationIssue[];
  scope: "pack" | "site";
}

export function SectionForm({
  packId,
  section,
  siteNumber,
  initialValues,
  packVersion,
  canEdit,
  issues,
  scope,
}: Props) {
  const storageKey = `tqp:${packId}:${section.id}:${scope}:${siteNumber ?? "pack"}`;

  const { value, setValue, state, error, saveNow } = useAutosave<SectionValues>({
    storageKey,
    initial: initialValues,
    save: async (values) => {
      const response = await fetch(`/api/packs/${packId}/sections/${section.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values, siteNumber }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Save failed");
      }
    },
  });

  const groups = useMemo(
    () => (scope === "pack" ? (section.packGroups ?? []) : (section.siteGroups ?? [])),
    [scope, section],
  );

  const issueFor = (fieldId: string) =>
    issues.find((issue) => issue.fieldId === fieldId && issue.sectionId === section.id)?.message;

  function set(fieldId: string, next: FieldValue) {
    setValue({ ...value, [fieldId]: next });
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void saveNow();
      }}
      aria-describedby="save-status"
    >
      <p id="save-status" aria-live="polite" className="text-sm">
        {state === "saving" && "Saving..."}
        {state === "saved" && "All changes saved"}
        {state === "dirty" && "Unsaved changes"}
        {state === "offline" && "Offline - changes are held on this device and will be retried"}
        {state === "error" && `Save failed: ${error ?? "unknown error"}`}
      </p>

      {groups.map((group) => (
        <fieldset key={group.id} className="rounded-md border border-slate-300 bg-white p-4">
          <legend className="px-1 text-base font-semibold">{group.title}</legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.fields.map((field) => (
              <Field
                key={field.id}
                field={field}
                value={value[field.id]}
                inherited={Boolean(field.sharedFrom)}
                issue={issueFor(field.id)}
                onChange={(next) => (canEdit ? set(field.id, next) : undefined)}
              />
            ))}
          </div>
        </fieldset>
      ))}

      {section.id === "tef3071" ? (
        <>
          <fieldset className="rounded-md border border-slate-300 bg-white p-4">
            <legend className="px-1 text-base font-semibold">Work undertaken</legend>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="text-left">
                    <th scope="col" className="py-2">Work undertaken</th>
                    <th scope="col">Y/N</th>
                    <th scope="col">Part to be completed</th>
                  </tr>
                </thead>
                <tbody>
                  {TEF3071_WORK_TYPES.map((work) => (
                    <tr key={work.id} className="border-t border-slate-200">
                      <td className="py-2 pr-2">{work.label}</td>
                      <td>
                        <select
                          aria-label={`${work.label} - completed`}
                          className="min-h-11 rounded-md border border-slate-400 px-2"
                          value={String(value[`workType.${work.id}`] ?? "")}
                          onChange={(event) => set(`workType.${work.id}`, event.target.value)}
                        >
                          <option value="">-</option>
                          {OPTIONS.yesNo.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </td>
                      <td className="pl-2">{work.part}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </fieldset>

          <fieldset className="rounded-md border border-slate-300 bg-white p-4">
            <legend className="px-1 text-base font-semibold">Work-in-progress checks</legend>
            {(["in", "out"] as const).map((ramp) => (
              <div key={ramp} className="mb-4 overflow-x-auto">
                <h3 className="mb-2 font-semibold">{ramp === "in" ? "Ramp in" : "Ramp out"}</h3>
                <table className="w-full min-w-[42rem] text-sm">
                  <thead>
                    <tr className="text-left">
                      <th scope="col">Location</th>
                      {TEF3071_RAMP_COLUMNS.map((column) => (
                        <th key={column.id} scope="col">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TEF3071_RAMP_POSITIONS.map((position) => (
                      <tr key={position} className="border-t border-slate-200">
                        <th scope="row" className="py-1 pr-2 text-left font-normal">
                          {position}
                        </th>
                        {TEF3071_RAMP_COLUMNS.map((column) => {
                          const key = `ramp.${ramp}.${position}.${column.id}`;
                          return (
                            <td key={column.id} className="py-1 pr-2">
                              {column.type === "select" ? (
                                <select
                                  aria-label={`${ramp} ${position} ${column.label}`}
                                  className="min-h-11 rounded-md border border-slate-400 px-2"
                                  value={String(value[key] ?? "")}
                                  onChange={(event) => set(key, event.target.value)}
                                >
                                  <option value="">-</option>
                                  {(column.options ?? []).map((option) => (
                                    <option key={option}>{option}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  aria-label={`${ramp} ${position} ${column.label}`}
                                  className="min-h-11 w-24 rounded-md border border-slate-400 px-2"
                                  type={column.type === "number" ? "number" : "text"}
                                  value={String(value[key] ?? "")}
                                  onChange={(event) =>
                                    set(
                                      key,
                                      column.type === "number" && event.target.value !== ""
                                        ? Number(event.target.value)
                                        : event.target.value,
                                    )
                                  }
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </fieldset>

          <fieldset className="rounded-md border border-slate-300 bg-white p-4">
            <legend className="px-1 text-base font-semibold">Post-work checklist</legend>
            <ul className="flex flex-col gap-3">
              {TEF3071_CHECKLIST.map((item) => (
                <li key={item.id} className="border-t border-slate-200 pt-3">
                  <label className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      <strong>{item.label}</strong> - {item.detail}
                    </span>
                    <select
                      className="min-h-11 rounded-md border border-slate-400 px-2 sm:ml-4"
                      value={String(value[`checklist.${item.id}`] ?? "")}
                      onChange={(event) => set(`checklist.${item.id}`, event.target.value)}
                    >
                      <option value="">-</option>
                      {OPTIONS.yesNoNa.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        </>
      ) : null}

      {section.id === "tef3207" ? (
        <>
          {TEF3207_TICK_GROUPS.map((group) => (
            <fieldset key={group.id} className="rounded-md border border-slate-300 bg-white p-4">
              <legend className="px-1 text-base font-semibold">
                {group.title}
                {group.single ? " (one option only)" : ""}
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.options.map((option) => {
                  const key = `tick.${group.id}.${option}`;
                  return (
                    <label key={option} className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={value[key] === true}
                        onChange={(event) => {
                          if (group.single && event.target.checked) {
                            const cleared: SectionValues = { ...value };
                            for (const other of group.options) {
                              cleared[`tick.${group.id}.${other}`] = false;
                            }
                            cleared[key] = true;
                            setValue(cleared);
                          } else {
                            set(key, event.target.checked);
                          }
                        }}
                      />
                      {option}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <fieldset className="rounded-md border border-slate-300 bg-white p-4">
            <legend className="px-1 text-base font-semibold">Track condition / work activity</legend>
            <label className="mb-3 block text-sm font-semibold">
              Track kind
              <select
                className="mt-1 block min-h-11 rounded-md border border-slate-400 px-2"
                value={String(value.conditionTrackKind ?? "cwr")}
                onChange={(event) => set("conditionTrackKind", event.target.value)}
              >
                <option value="cwr">CWR</option>
                <option value="jointed">Jointed track</option>
              </select>
            </label>
            <ul className="flex flex-col gap-2">
              {(value.conditionTrackKind === "jointed"
                ? TEF3207_JOINTED_CONDITIONS
                : TEF3207_CWR_CONDITIONS
              ).map((label, index) => {
                const kind = value.conditionTrackKind === "jointed" ? "jointed" : "cwr";
                const key = `condition.${kind}.${index + 1}`;
                return (
                  <li key={key}>
                    <label className="flex min-h-11 items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5"
                        checked={value[key] === true}
                        onChange={(event) => set(key, event.target.checked)}
                      />
                      <span>
                        {index + 1}. {label}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!canEdit}
          className="min-h-11 rounded-md bg-blue-700 px-5 text-white disabled:bg-slate-400"
        >
          Save
        </button>
        <span className="text-xs text-slate-600">Pack version {packVersion}</span>
      </div>
    </form>
  );
}
