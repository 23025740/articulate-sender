import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Download,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  addEntry,
  clearHistory,
  deleteEntry,
  loadHistory,
  type EmailInputs,
  type HistoryEntry,
} from "@/lib/history";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Email Generator — AI-written emails in seconds" },
      {
        name: "description",
        content:
          "Generate professional, context-aware emails tailored to any audience and tone. Refine, copy, and download instantly.",
      },
      { property: "og:title", content: "Smart Email Generator" },
      {
        property: "og:description",
        content:
          "Generate professional, context-aware emails tailored to any audience and tone.",
      },
    ],
  }),
  component: Index,
});

const AUDIENCES = [
  "Client",
  "Manager",
  "Team Member",
  "Executive",
  "Vendor",
  "Other",
];
const TONES = [
  "Formal",
  "Informal",
  "Persuasive",
  "Friendly",
  "Professional",
  "Apologetic",
  "Appreciative",
  "Urgent",
];
const LENGTHS = ["Short", "Medium", "Detailed"] as const;

const EMPTY_INPUTS: EmailInputs = {
  purpose: "",
  details: "",
  audience: "Manager",
  tone: "Formal",
  length: "Medium",
  cta: "",
  senderName: "",
};

type Result = { subject: string; body: string };

function Index() {
  const [inputs, setInputs] = useState<EmailInputs>(EMPTY_INPUTS);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineText, setRefineText] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAudience, setFilterAudience] = useState("All");
  const [filterTone, setFilterTone] = useState("All");

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const canGenerate = useMemo(
    () => inputs.purpose.trim().length > 0 && inputs.details.trim().length > 0,
    [inputs],
  );

  async function callApi(payload: Record<string, unknown>): Promise<Result> {
    const res = await fetch("/api/generate-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}) as Record<string, unknown>);
    if (!res.ok) {
      throw new Error(
        (data as { error?: string }).error ??
          `Request failed (${res.status})`,
      );
    }
    return data as Result;
  }

  async function generate() {
    if (!canGenerate || loading) return;
    setLoading(true);
    try {
      const r = await callApi(inputs);
      setResult(r);
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        inputs,
        subject: r.subject,
        body: r.body,
      };
      setHistory(addEntry(entry));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function refine() {
    if (!result || refining || !refineText.trim()) return;
    setRefining(true);
    try {
      const r = await callApi({
        ...inputs,
        previousEmail: `Subject: ${result.subject}\n\n${result.body}`,
        refineInstruction: refineText.trim(),
      });
      setResult(r);
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        inputs,
        subject: r.subject,
        body: r.body,
      };
      setHistory(addEntry(entry));
      setRefineText("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRefining(false);
    }
  }

  function fullText(r: Result) {
    return `Subject: ${r.subject}\n\n${r.body}`;
  }

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(fullText(result));
    toast.success("Copied to clipboard");
  }

  function download(kind: "txt" | "eml") {
    if (!result) return;
    const content =
      kind === "eml"
        ? `Subject: ${result.subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${result.body}`
        : fullText(result);
    const blob = new Blob([content], {
      type: kind === "eml" ? "message/rfc822" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe = result.subject.replace(/[^a-z0-9-_ ]/gi, "").slice(0, 50) || "email";
    a.download = `${safe}.${kind}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function newEmail() {
    setResult(null);
    setRefineText("");
    setInputs(EMPTY_INPUTS);
  }

  function openHistory(entry: HistoryEntry) {
    setInputs(entry.inputs);
    setResult({ subject: entry.subject, body: entry.body });
    setRefineText("");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function removeEntry(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setHistory(deleteEntry(id));
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8 lg:py-12">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">
                Smart Email
              </div>
              <div className="text-xs text-muted-foreground">Generator</div>
            </div>
          </div>

          <Button
            onClick={newEmail}
            variant="outline"
            className="mt-6 w-full justify-start gap-2"
          >
            <Plus className="h-4 w-4" /> New email
          </Button>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                History
              </span>
              {history.length > 0 && (
                <button
                  onClick={() => setHistory(clearHistory())}
                  className="text-xs text-muted-foreground transition hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-1">
              {history.length === 0 && (
                <p className="px-1 text-xs text-muted-foreground">
                  Generated emails will appear here.
                </p>
              )}
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => openHistory(h)}
                  className="group flex w-full items-start gap-2 rounded-md border border-transparent px-2 py-2 text-left transition hover:border-border hover:bg-card"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {h.subject || "(no subject)"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {h.inputs.audience} · {h.inputs.tone} ·{" "}
                      {new Date(h.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    role="button"
                    aria-label="Delete"
                    onClick={(e) => removeEntry(h.id, e)}
                    className="opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 space-y-6">
          <header>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Write the right email, every time.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
              Describe your goal, pick a tone, and get a polished email tailored
              to your audience.
            </p>
          </header>

          <Card className="border-border/70 p-5 shadow-sm md:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Textarea
                  id="purpose"
                  placeholder="e.g. Request a one-week deadline extension on the Acme project"
                  value={inputs.purpose}
                  onChange={(e) =>
                    setInputs({ ...inputs, purpose: e.target.value })
                  }
                  rows={2}
                  className="mt-1.5"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="details">Key details</Label>
                <Textarea
                  id="details"
                  placeholder={`- Current dev phase delayed\n- Additional QA required\n- Need one extra week`}
                  value={inputs.details}
                  onChange={(e) =>
                    setInputs({ ...inputs, details: e.target.value })
                  }
                  rows={5}
                  className="mt-1.5 font-mono text-sm"
                />
              </div>

              <div>
                <Label>Audience</Label>
                <Select
                  value={inputs.audience}
                  onValueChange={(v) => setInputs({ ...inputs, audience: v })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tone</Label>
                <Select
                  value={inputs.tone}
                  onValueChange={(v) => setInputs({ ...inputs, tone: v })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Length</Label>
                <div className="mt-1.5 inline-flex w-full rounded-md border border-input bg-background p-0.5">
                  {LENGTHS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setInputs({ ...inputs, length: l })}
                      className={`flex-1 rounded px-3 py-1.5 text-sm transition ${
                        inputs.length === l
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="sender">Your name (optional)</Label>
                <Input
                  id="sender"
                  placeholder="Alex Morgan"
                  value={inputs.senderName}
                  onChange={(e) =>
                    setInputs({ ...inputs, senderName: e.target.value })
                  }
                  className="mt-1.5"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="cta">Call-to-action (optional)</Label>
                <Input
                  id="cta"
                  placeholder="e.g. Confirm the new deadline by Friday"
                  value={inputs.cta}
                  onChange={(e) =>
                    setInputs({ ...inputs, cta: e.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Powered by AI · Saved locally to your browser
              </p>
              <Button
                onClick={generate}
                disabled={!canGenerate || loading}
                size="lg"
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {result ? "Regenerate" : "Generate email"}
                  </>
                )}
              </Button>
            </div>
          </Card>

          {result && (
            <Card className="border-border/70 p-5 shadow-sm md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Subject
                  </div>
                  <div className="mt-0.5 text-lg font-semibold leading-tight">
                    {result.subject}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyResult}
                    className="gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => download("txt")}>
                        Plain text (.txt)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => download("eml")}>
                        Email file (.eml)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generate}
                    disabled={loading}
                    className="gap-1.5"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                    />
                    Regenerate
                  </Button>
                </div>
              </div>

              <Separator className="my-5" />

              <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-relaxed text-foreground">
                {result.body}
              </pre>

              <Separator className="my-5" />

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Wand2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Refine: e.g. make it shorter, more apologetic, add a thank-you line…"
                    value={refineText}
                    onChange={(e) => setRefineText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") refine();
                    }}
                    className="pl-9"
                  />
                </div>
                <Button
                  onClick={refine}
                  disabled={refining || !refineText.trim()}
                  variant="secondary"
                  className="gap-2"
                >
                  {refining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  Refine
                </Button>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
