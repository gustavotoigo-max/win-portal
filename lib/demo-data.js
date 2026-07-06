export const demoLicenses = [
  {
    id: "lic-001",
    key: "WIN-PORTAL-9F42-ACTIVE",
    status: "active",
    lastMachine: "DESKTOP-GUSTAVO",
    lastSeen: "2026-07-06",
    order: "ORD-1048",
    date: "2026-07-02",
    user: "cliente@empresa.com"
  },
  {
    id: "lic-002",
    key: "WIN-PORTAL-31BB-BLOCK",
    status: "blocked",
    lastMachine: "NOTEBOOK-FINANCEIRO",
    lastSeen: "2026-06-28",
    order: "ORD-1039",
    date: "2026-06-19",
    user: "financeiro@empresa.com"
  },
  {
    id: "lic-003",
    key: "WIN-PORTAL-82AA-REVOKED",
    status: "revoked",
    lastMachine: "WORKSTATION-01",
    lastSeen: "2026-05-14",
    order: "ORD-0997",
    date: "2026-05-01",
    user: "suporte@empresa.com"
  }
];

export function statusClass(status) {
  return `status-pill status-${status}`;
}
