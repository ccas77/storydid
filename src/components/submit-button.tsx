"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ idle, pending, className = "primary" }: { idle: string; pending: string; className?: string }) {
  const status = useFormStatus();
  return <button className={className} type="submit" disabled={status.pending}>
    {status.pending ? pending : idle}
  </button>;
}
