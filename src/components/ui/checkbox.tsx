interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: CheckboxFieldProps) {
  return (
    <button
      type="button"
      className="group flex w-full items-start gap-3 rounded-2xl border border-[var(--line)] bg-white/60 p-4 text-left backdrop-blur-md transition-all hover:border-[var(--brand)] hover:bg-white/85"
      onClick={() => onChange(!checked)}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          checked
            ? "border-[var(--brand)] bg-[var(--brand)] text-white"
            : "border-[var(--line-4)] bg-white"
        }`}
      >
        {checked && (
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </span>
      <span className="text-sm leading-relaxed text-[var(--ink)]">{label}</span>
    </button>
  );
}