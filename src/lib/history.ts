export type EmailInputs = {
  purpose: string;
  details: string;
  audience: string;
  tone: string;
  length: "Short" | "Medium" | "Detailed";
  cta?: string;
  senderName?: string;
};

export type HistoryEntry = {
  id: string;
  createdAt: number;
  inputs: EmailInputs;
  subject: string;
  body: string;
};

const KEY = "seg.history.v1";
const MAX = 50;

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch {
    /* ignore quota errors */
  }
}

export function addEntry(entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...loadHistory()].slice(0, MAX);
  saveHistory(next);
  return next;
}

export function deleteEntry(id: string): HistoryEntry[] {
  const next = loadHistory().filter((e) => e.id !== id);
  saveHistory(next);
  return next;
}

export function clearHistory(): HistoryEntry[] {
  saveHistory([]);
  return [];
}