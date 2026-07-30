"use client";

import { type ChangeEvent, useId, useRef, useState } from "react";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  className: string;
  autoFocus?: boolean;
  scope?: string;
};

export function SearchInput({ value, onChange, placeholder, ariaLabel, className, autoFocus, scope = "global" }: SearchInputProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [locked, setLocked] = useState(!autoFocus);
  const armed = useRef(Boolean(autoFocus));
  const fieldId = `food-gedi-${scope}-query-${id}`;

  function arm(event: { currentTarget: HTMLInputElement }) {
    armed.current = true;
    setLocked(false);
    event.currentTarget.readOnly = false;
  }

  function change(event: ChangeEvent<HTMLInputElement>) {
    if (!armed.current) return;
    onChange(event.target.value);
  }

  return (
    <input
      id={fieldId}
      name={fieldId}
      type="search"
      role="searchbox"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="none"
      spellCheck={false}
      enterKeyHint="search"
      inputMode="search"
      data-lpignore="true"
      data-1p-ignore="true"
      data-form-type="search"
      readOnly={locked}
      autoFocus={autoFocus}
      value={value}
      onPointerDown={arm}
      onKeyDown={arm}
      onFocus={arm}
      onChange={change}
      className={className}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
  );
}
