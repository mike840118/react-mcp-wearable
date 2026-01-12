const CONSENT_TOOLS = new Set(["createIncident", "notifySupervisor", "writeDailyReport"]);

export function requiresConsent(toolName: string) {
  return CONSENT_TOOLS.has(toolName);
}
