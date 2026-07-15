export function isAuthorizedAction(formData: FormData) {
  const configured = process.env.RESEARCH_ACCESS_CODE;
  if (!configured) return process.env.NODE_ENV !== "production";
  return String(formData.get("accessCode") ?? "") === configured;
}

export function accessCodeConfigured() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.RESEARCH_ACCESS_CODE);
}

export function accessCodeReady() {
  return Boolean(process.env.RESEARCH_ACCESS_CODE) || process.env.NODE_ENV !== "production";
}
