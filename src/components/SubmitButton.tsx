"use client";

import { useSyncExternalStore, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

const noop = () => () => {};

/**
 * True once React has hydrated. Submitting a server-action form before that falls back to a
 * native POST, which Next 16 answers without the page shell (blank screen), so submit
 * buttons stay disabled until then (usually a fraction of a second).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

type Props = ComponentProps<"button"> & { spinner?: boolean };

export function SubmitButton({ children, disabled, spinner = true, ...rest }: Props) {
  const hydrated = useHydrated();
  const { pending } = useFormStatus();
  return (
    <button {...rest} disabled={disabled || pending || !hydrated}>
      {spinner && pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
