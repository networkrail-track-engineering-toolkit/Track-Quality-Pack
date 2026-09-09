"use client";

import type { FieldDef } from "@/lib/config/fields";
import type { FieldValue } from "@/lib/domain/validation";

interface FieldProps {
  field: FieldDef;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
  inherited?: boolean;
  issue?: string;
}

const inputClass =
  "w-full min-h-11 rounded-md border border-slate-400 bg-white px-3 py-2 text-base text-slate-900 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-slate-100";

export function Field({ field, value, onChange, inherited, issue }: FieldProps) {
  const id = `field-${field.id}`;
  const describedBy = issue ? `${id}-error` : inherited ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        {field.label}
        {field.required ? <span className="text-red-700"> *</span> : null}
      </label>

      {field.type === "textarea" ? (
        <textarea
          id={id}
          className={`${inputClass} min-h-24`}
          value={value === null || value === undefined ? "" : String(value)}
          aria-describedby={describedBy}
          aria-invalid={Boolean(issue)}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : field.type === "select" || field.type === "yesno" ? (
        <select
          id={id}
          className={inputClass}
          value={value === null || value === undefined ? "" : String(value)}
          aria-describedby={describedBy}
          aria-invalid={Boolean(issue)}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select...</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          className={inputClass}
          type={
            field.type === "number"
              ? "number"
              : field.type === "date"
                ? "date"
                : field.type === "time"
                  ? "time"
                  : "text"
          }
          inputMode={field.type === "number" ? "decimal" : undefined}
          value={value === null || value === undefined ? "" : String(value)}
          aria-describedby={describedBy}
          aria-invalid={Boolean(issue)}
          onChange={(event) =>
            onChange(
              field.type === "number"
                ? event.target.value === ""
                  ? ""
                  : Number(event.target.value)
                : event.target.value,
            )
          }
        />
      )}

      {inherited && !issue ? (
        <p id={`${id}-hint`} className="text-xs text-slate-600">
          Populated from the TQS Form. Editing here overrides the shared value.
        </p>
      ) : null}
      {issue ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-red-700">
          {issue}
        </p>
      ) : null}
    </div>
  );
}
