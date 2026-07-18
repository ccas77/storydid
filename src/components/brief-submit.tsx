"use client";

import { useFormStatus } from "react-dom";

export function BriefSubmit() {
  const { pending } = useFormStatus();
  return <button className="primary" type="submit" disabled={pending}>
    {pending ? "Researching your story… (~1 min)" : "Start research"}
  </button>;
}
