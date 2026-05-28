import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const InputSchema = z.object({
  purpose: z.string().min(1).max(2000),
  details: z.string().min(1).max(4000),
  audience: z.string().min(1).max(60),
  tone: z.string().min(1).max(60),
  length: z.enum(["Short", "Medium", "Detailed"]),
  cta: z.string().max(400).optional().default(""),
  senderName: z.string().max(120).optional().default(""),
  refineInstruction: z.string().max(1000).optional().default(""),
  previousEmail: z.string().max(8000).optional().default(""),
});

const SYSTEM_PROMPT = `You are an advanced Smart Email Generator that writes professional, context-aware emails.

Follow these rules:
1. Context-Based Generation: clearly communicate the message with logical flow and no unnecessary information.
2. Tone Adaptation: match the requested tone exactly (Formal, Informal, Persuasive, Friendly, Professional, Apologetic, Appreciative, Urgent).
3. Audience Adaptation: Client = value/trust focused; Manager = concise, results-oriented; Team = collaborative; Executive = high-level and brief; Vendor = clear and transactional.
4. Structure: Subject line, greeting, opening (purpose), body (logical details), closing (next steps / CTA), professional sign-off.
5. Quality: grammatically correct, polished, concise yet complete, no ambiguity, no markdown formatting, no code fences.

Output format (STRICT):
The FIRST line must be exactly: Subject: <subject line>
Then a blank line.
Then the email body starting with the greeting and ending with the sign-off.
Do not include any other commentary, labels, or markdown — output ONLY the email.`;

function buildUserPrompt(input: z.infer<typeof InputSchema>) {
  const lines = [
    `Purpose: ${input.purpose}`,
    `Audience: ${input.audience}`,
    `Tone: ${input.tone}`,
    `Length preference: ${input.length} (${
      input.length === "Short"
        ? "~60-100 words"
        : input.length === "Medium"
          ? "~120-200 words"
          : "~220-350 words"
    })`,
    `Key details:\n${input.details}`,
  ];
  if (input.cta) lines.push(`Call to action: ${input.cta}`);
  lines.push(
    `Sender name to use in sign-off: ${input.senderName || "[Your Name]"}`,
  );
  if (input.previousEmail && input.refineInstruction) {
    lines.push(
      `\nYou previously wrote this email:\n---\n${input.previousEmail}\n---\nApply this refinement: ${input.refineInstruction}\nReturn the full revised email in the same strict output format.`,
    );
  }
  return lines.join("\n");
}

export const Route = createFileRoute("/api/generate-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: z.infer<typeof InputSchema>;
        try {
          const body = await request.json();
          parsed = InputSchema.parse(body);
        } catch (err) {
          return new Response(
            JSON.stringify({ error: "Invalid request", details: String(err) }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response(
            JSON.stringify({ error: "Missing LOVABLE_API_KEY" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        try {
          const { text } = await generateText({
            model,
            system: SYSTEM_PROMPT,
            prompt: buildUserPrompt(parsed),
          });

          const trimmed = text.trim();
          const match = trimmed.match(/^Subject:\s*(.+?)\s*\n([\s\S]*)$/);
          const subject = match ? match[1].trim() : "(no subject)";
          const body = (match ? match[2] : trimmed).trim();

          return Response.json({ subject, body, raw: trimmed });
        } catch (err: unknown) {
          const e = err as { statusCode?: number; status?: number; message?: string };
          const status = e.statusCode ?? e.status ?? 500;
          if (status === 429) {
            return new Response(
              JSON.stringify({
                error: "Rate limit reached. Please wait a moment and try again.",
              }),
              { status: 429, headers: { "Content-Type": "application/json" } },
            );
          }
          if (status === 402) {
            return new Response(
              JSON.stringify({
                error:
                  "AI credits exhausted. Add credits in Settings → Workspace → Usage.",
              }),
              { status: 402, headers: { "Content-Type": "application/json" } },
            );
          }
          return new Response(
            JSON.stringify({
              error: e.message ?? "Failed to generate email",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});