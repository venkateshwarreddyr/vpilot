import { ChatRequest, LLMResponse, PageContent } from "./types";

export async function callChat(
  backendUrl: string,
  backendApiKey: string,
  payload: ChatRequest,
): Promise<LLMResponse> {
  const res = await fetch(`${backendUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${backendApiKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error ${res.status}: ${text}`);
  }
  return (await res.json()) as LLMResponse;
}

export async function callSynthesize(
  backendUrl: string,
  backendApiKey: string,
  tabs: { url: string; title: string; content: PageContent }[],
  prompt: string,
  provider: string,
  model: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch(`${backendUrl}/api/synthesize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${backendApiKey}`,
    },
    body: JSON.stringify({ tabs, prompt, provider, model, api_key: apiKey }),
  });
  if (!res.ok) throw new Error(`Backend error ${res.status}`);
  const data = (await res.json()) as { result: string };
  return data.result;
}

export async function callScreenshot(
  backendUrl: string,
  backendApiKey: string,
  imageBase64: string,
  prompt: string,
  provider: string,
  model: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch(`${backendUrl}/api/screenshot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${backendApiKey}`,
    },
    body: JSON.stringify({
      image_base64: imageBase64,
      prompt,
      provider,
      model,
      api_key: apiKey,
    }),
  });
  if (!res.ok) throw new Error(`Backend error ${res.status}`);
  const data = (await res.json()) as { analysis: string };
  return data.analysis;
}
