"use client";

import { useFormStatus } from "react-dom";

export function BriefSubmit() {
  const { pending } = useFormStatus();
  return <button className="primary" type="submit" disabled={pending}>
    {pending ? "Writing your article… (~1 min)" : "Write the article"}
  </button>;
}
