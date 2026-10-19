import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NON_TEXT_ID, type ProviderId } from "@/config/models";
import type { CatalogModel } from "@/lib/models/orchestrator";

export type ProviderStatus = {
  provider: ProviderId;
  status: "ok" | "missing_key" | "error";
  message?: string;
};

function apiKey(provider: ProviderId): string | undefined {
  if (provider === "google") return process.env.GEMINI_API_KEY;
  if (provider === "openai") return process.env.OPENAI_API_KEY;
  return process.env.ANTHROPIC_API_KEY;
}

export function configuredProviders(): ProviderId[] {
  return (["google", "openai", "anthropic"] as const).filter((provider) => Boolean(apiKey(provider)));
}

export async function listProvider(provider: ProviderId): Promise<{
  models: CatalogModel[];
  status: ProviderStatus;
}> {
  const key = apiKey(provider);
  if (!key) {
    return { models: [], status: { provider, status: "missing_key" } };
  }
  try {
    const models = await withTimeout(20000, (signal) => listLive(provider, key, signal));
    return {
      models: models.filter((model) => !NON_TEXT_ID.test(model.id)),
      status: { provider, status: "ok" },
    };
  } catch (error) {
    return {
      models: [],
      status: { provider, status: "error", message: errorText(error) },
    };
  }
}

export async function generateText(
  provider: ProviderId,
  model: string,
  system: string,
  user: string,
): Promise<string> {
  const key = apiKey(provider);
  if (!key) throw new Error(`${provider} key is not set`);
  return withTimeout(25000, (signal) => complete(provider, key, model, system, user, signal));
}

async function listLive(provider: ProviderId, apiKey: string, signal: AbortSignal): Promise<CatalogModel[]> {
  if (provider === "google") {
    const ai = new GoogleGenAI({ apiKey });
    const pager = await ai.models.list({ config: { pageSize: 100, abortSignal: signal } });
    const models: CatalogModel[] = [];
    for await (const model of pager) {
      const id = (model.name ?? "").replace(/^models\//, "");
      if (!id) continue;
      if (model.supportedActions?.length && !model.supportedActions.includes("generateContent")) continue;
      models.push({ id, provider, displayName: model.displayName || id });
    }
    return models;
  }
  if (provider === "openai") {
    const client = new OpenAI({ apiKey });
    const page = await client.models.list({ signal });
    const models: CatalogModel[] = [];
    for await (const model of page) {
      models.push({ id: model.id, provider, displayName: model.id });
    }
    return models;
  }
  const client = new Anthropic({ apiKey });
  const models: CatalogModel[] = [];
  for await (const model of client.models.list({ limit: 100 }, { signal })) {
    if (model.lifecycle === "retired") continue;
    models.push({ id: model.id, provider, displayName: model.display_name || model.id });
  }
  return models;
}

async function complete(
  provider: ProviderId,
  apiKey: string,
  model: string,
  system: string,
  user: string,
  signal: AbortSignal,
): Promise<string> {
  if (provider === "google") {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: user,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        abortSignal: signal,
      },
    });
    return response.text ?? "";
  }
  if (provider === "openai") {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create(
      {
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      },
      { signal },
    );
    return completion.choices[0]?.message?.content ?? "";
  }
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create(
    {
      model,
      max_tokens: 800,
      system,
      messages: [{ role: "user", content: user }],
    },
    { signal },
  );
  return message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");
}

async function withTimeout<T>(ms: number, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  return work(AbortSignal.timeout(ms));
}

function errorText(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Model request failed";
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed.error?.message) return parsed.error.message;
  } catch {
    // Provider errors are not always JSON.
  }
  return raw;
}

export { errorText };
