/**
 * Mode-specific pricing, SDK/proxy snippets, and capability rows for the catalog UI.
 */

import { formatExactUsd, formatPricingSlot, formatTokenCostPerMillion, slotSortValue, type PricingSlots } from "./catalogApi";

export function isImagePricingMode(mode: string | undefined): boolean {
  const m = (mode || "").toLowerCase();
  return m === "image_generation" || m === "image_edit";
}

export function isAudioPricingMode(mode: string | undefined): boolean {
  const m = (mode || "").toLowerCase();
  return m === "audio_transcription" || m === "audio_speech";
}

type PriceFormat = "usd_per_image" | "usd_per_million" | "usd_per_pixel";

/** Catalog keys used for image_generation / image_edit pricing (order = display priority). */
const IMAGE_PRICE_FIELDS: { key: string; label: string; format: PriceFormat }[] = [
  { key: "output_cost_per_image", label: "Output (per image)", format: "usd_per_image" },
  { key: "input_cost_per_image", label: "Input (per image)", format: "usd_per_image" },
  { key: "output_cost_per_image_token", label: "Output image tokens", format: "usd_per_million" },
  { key: "input_cost_per_image_token", label: "Input image tokens", format: "usd_per_million" },
  { key: "output_cost_per_pixel", label: "Output (per pixel)", format: "usd_per_pixel" },
  { key: "input_cost_per_pixel", label: "Input (per pixel)", format: "usd_per_pixel" },
  {
    key: "output_cost_per_image_above_1024_and_1024_pixels",
    label: "Output (>1024×1024 px)",
    format: "usd_per_image",
  },
  {
    key: "output_cost_per_image_above_512_and_512_pixels",
    label: "Output (>512×512 px)",
    format: "usd_per_image",
  },
  { key: "output_cost_per_image_premium_image", label: "Output (premium image)", format: "usd_per_image" },
  {
    key: "output_cost_per_image_above_1024_and_1024_pixels_and_premium_image",
    label: "Output (>1024², premium)",
    format: "usd_per_image",
  },
  {
    key: "output_cost_per_image_above_512_and_512_pixels_and_premium_image",
    label: "Output (>512², premium)",
    format: "usd_per_image",
  },
  { key: "input_cost_per_token", label: "Input (text tokens)", format: "usd_per_million" },
  { key: "output_cost_per_token", label: "Output (text tokens)", format: "usd_per_million" },
];

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function formatUsdFlat(n: number): string {
  return formatExactUsd(n);
}

function formatUsdPerMillion(perToken: number): string {
  return formatTokenCostPerMillion(perToken).replace(/\/M$/, "/M tok");
}

/** e.g. `256-x-256/dall-e-2` → { width: 256, height: 256 } */
export function parseResolutionFromModelName(
  name: string,
): { width: number; height: number } | null {
  const m = name.match(/(\d+)-x-(\d+)/i);
  if (!m) return null;
  const width = Number(m[1]);
  const height = Number(m[2]);
  if (!width || !height) return null;
  return { width, height };
}

function formatUsdPerPixel(perPixel: number, modelName?: string): string {
  const res = modelName ? parseResolutionFromModelName(modelName) : null;
  if (res) {
    const perImage = perPixel * res.width * res.height;
    return formatExactUsd(perImage, "/img");
  }
  return formatExactUsd(perPixel * 1e6, "/Mpx");
}

function formatImageCatalogValue(
  format: PriceFormat,
  raw: number,
  modelName?: string,
): string {
  switch (format) {
    case "usd_per_image":
      return formatExactUsd(raw, "/img");
    case "usd_per_million":
      return formatTokenCostPerMillion(raw);
    case "usd_per_pixel":
      return formatUsdPerPixel(raw, modelName);
    default:
      return String(raw);
  }
}

const IMAGE_EXTRA_PRICE_KEYS = new Set([
  "output_cost_per_image_above_1024_and_1024_pixels",
  "output_cost_per_image_above_512_and_512_pixels",
  "output_cost_per_image_premium_image",
  "output_cost_per_image_above_1024_and_1024_pixels_and_premium_image",
  "output_cost_per_image_above_512_and_512_pixels_and_premium_image",
  "input_cost_per_image_token",
  "output_cost_per_image_token",
  "input_cost_per_token",
  "output_cost_per_token",
]);

function imageSlotCost(
  item: Record<string, unknown>,
  slotName: "input" | "output",
): string {
  const slots = item.pricing_slots as PricingSlots | undefined;
  const slot = slots?.[slotName];
  if (!slot || slot.amount_usd == null) return "—";
  const modelName = String(item.name ?? "");
  if (slot.unit === "per_pixel") {
    return formatUsdPerPixel(slot.amount_usd, modelName);
  }
  return formatPricingSlot(slot);
}

function formatImageSlotForDisplay(
  item: Record<string, unknown>,
  slotName: "input" | "output",
): string {
  const fromSlot = imageSlotCost(item, slotName);
  if (fromSlot !== "—") return fromSlot;
  const modelName = String(item.name ?? "");
  const prefix = slotName === "input" ? "input_" : "output_";
  let sawZero = false;
  for (const { key, format } of IMAGE_PRICE_FIELDS) {
    if (!key.startsWith(prefix)) continue;
    const raw = num(item[key]);
    if (raw === null) continue;
    if (raw === 0) {
      sawZero = true;
      continue;
    }
    return formatImageCatalogValue(format, raw, modelName);
  }
  if (sawZero) return formatExactUsd(0, "/img");
  return "—";
}

/** Primary value for table “input” column (image modes). */
export function tableImageInputCost(item: Record<string, unknown>): string {
  return formatImageSlotForDisplay(item, "input");
}

/** Primary value for table “output” column (image modes). */
export function tableImageOutputCost(item: Record<string, unknown>): string {
  return formatImageSlotForDisplay(item, "output");
}

/** Tier / token extras shown below the main 2×2 grid (image modes only). */
export function getImagePricingExtraRows(
  item: Record<string, unknown>,
): { label: string; value: string }[] {
  const modelName = String(item.name ?? "");
  const rows: { label: string; value: string }[] = [];
  for (const { key, label, format } of IMAGE_PRICE_FIELDS) {
    if (!IMAGE_EXTRA_PRICE_KEYS.has(key)) continue;
    const raw = num(item[key]);
    if (raw === null || raw === 0) continue;
    rows.push({ label, value: formatImageCatalogValue(format, raw, modelName) });
  }
  return rows;
}

export function imageModeInputSortValue(item: Record<string, unknown>): number {
  const slots = item.pricing_slots as PricingSlots | undefined;
  if (slots?.input && (slots.input.amount_usd != null || slots.input.unit)) {
    return slotSortValue(slots.input);
  }
  const modelName = String(item.name ?? "");
  for (const { key, format } of IMAGE_PRICE_FIELDS) {
    if (!key.startsWith("input_")) continue;
    const raw = num(item[key]);
    if (raw === null || raw === 0) continue;
    if (format === "usd_per_million") return raw * 1e6;
    if (format === "usd_per_pixel") {
      const res = parseResolutionFromModelName(modelName);
      return res ? raw * res.width * res.height : raw * 1e6;
    }
    return raw;
  }
  return 0;
}

export function imageModeOutputSortValue(item: Record<string, unknown>): number {
  const slots = item.pricing_slots as PricingSlots | undefined;
  if (slots?.output && (slots.output.amount_usd != null || slots.output.unit)) {
    const v = slotSortValue(slots.output);
    if (v > 0) return v;
  }
  const modelName = String(item.name ?? "");
  for (const { key, format } of IMAGE_PRICE_FIELDS) {
    if (!key.startsWith("output_")) continue;
    const raw = num(item[key]);
    if (raw === null || raw === 0) continue;
    if (format === "usd_per_million") return raw * 1e6;
    if (format === "usd_per_pixel") {
      const res = parseResolutionFromModelName(modelName);
      return res ? raw * res.width * res.height : raw * 1e6;
    }
    return raw;
  }
  return 0;
}

export function getLiteLLmSdkSnippet(mode: string | undefined, model: string): string {
  const m = (mode || "").toLowerCase();
  if (m === "image_generation") {
    return `from litellm import image_generation

response = image_generation(
    model="${model}",
    prompt="A cute baby sea otter",
)`;
  }
  if (m === "image_edit") {
    return `from litellm import image_edit

response = image_edit(
    model="${model}",
    image=open("image.png", "rb"),
    prompt="Describe your edit",
)`;
  }
  if (m === "embedding") {
    return `from litellm import embedding

response = embedding(
    model="${model}",
    input=["hello world"],
)`;
  }
  if (m === "audio_transcription") {
    return `from litellm import transcription

response = transcription(
    model="${model}",
    file=open("audio.mp3", "rb"),
)`;
  }
  if (m === "audio_speech") {
    return `from litellm import speech

response = speech(
    model="${model}",
    input="Hello from LiteLLM",
    voice="alloy",
)`;
  }
  return `from litellm import completion

response = completion(
    model="${model}",
    messages=[{"role": "user", "content": "Hello!"}],
)`;
}

export function getLiteLLmProxyCurlSnippet(mode: string | undefined, model: string): string {
  const m = (mode || "").toLowerCase();
  if (m === "image_generation") {
    return `curl http://0.0.0.0:4000/v1/images/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-1234" \\
  -d '{
    "model": "${model}",
    "prompt": "A cute baby sea otter",
    "n": 1,
    "size": "1024x1024"
  }'`;
  }
  if (m === "image_edit") {
    return `curl http://0.0.0.0:4000/v1/images/edits \\
  -H "Authorization: Bearer sk-1234" \\
  -F model="${model}" \\
  -F image=@image.png \\
  -F prompt="Describe your edit"`;
  }
  if (m === "embedding") {
    return `curl http://0.0.0.0:4000/v1/embeddings \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-1234" \\
  -d '{
    "model": "${model}",
    "input": "hello world"
  }'`;
  }
  return `curl http://0.0.0.0:4000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-1234" \\
  -d '{
    "model": "${model}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;
}

/** Per-second catalog field → exact display. */
export function formatSecondCost(perSecond: number | null | undefined): string {
  if (perSecond === null || perSecond === undefined) return "—";
  return formatExactUsd(perSecond, "/s");
}

/** Per-character catalog field → exact display. */
export function formatCharacterCost(perChar: number | null | undefined): string {
  if (perChar === null || perChar === undefined) return "—";
  return formatExactUsd(perChar, "/char");
}

function displayInputCost(item: Record<string, unknown>): string {
  const s = (item.pricing_slots as PricingSlots | undefined)?.input;
  if (s && s.amount_usd != null) return formatPricingSlot(s);
  const perChar = num(item.input_cost_per_character);
  if (perChar !== null) return formatCharacterCost(perChar);
  const perSec = num(item.input_cost_per_second);
  if (perSec !== null) return formatSecondCost(perSec);
  return formatTokenCostPerMillion(num(item.input_cost_per_token));
}

function displayOutputCost(item: Record<string, unknown>): string {
  const s = (item.pricing_slots as PricingSlots | undefined)?.output;
  if (s && s.amount_usd != null) return formatPricingSlot(s);
  const perChar = num(item.output_cost_per_character);
  if (perChar !== null) return formatCharacterCost(perChar);
  const perSec = num(item.output_cost_per_second);
  if (perSec !== null) return formatSecondCost(perSec);
  return formatTokenCostPerMillion(num(item.output_cost_per_token));
}

/** Table + sort: non-image modes use token / second slots / raw catalog costs. */
export function displayChatInputCost(item: Record<string, unknown>): string {
  return displayInputCost(item);
}

export function displayChatOutputCost(item: Record<string, unknown>): string {
  return displayOutputCost(item);
}

export function displayChatCacheRead(item: Record<string, unknown>): string {
  const s = (item.pricing_slots as PricingSlots | undefined)?.cache_read;
  if (s && s.amount_usd != null) return formatPricingSlot(s);
  return formatTokenCostPerMillion(num(item.cache_read_input_token_cost));
}

export function displayChatCacheWrite(item: Record<string, unknown>): string {
  const s = (item.pricing_slots as PricingSlots | undefined)?.cache_write;
  if (s && s.amount_usd != null) return formatPricingSlot(s);
  return formatTokenCostPerMillion(num(item.cache_creation_input_token_cost));
}

export function chatSortInput(item: Record<string, unknown>): number {
  const slots = item.pricing_slots as PricingSlots | undefined;
  if (slots?.input && slots.input.amount_usd != null) return slotSortValue(slots.input);
  const perChar = num(item.input_cost_per_character);
  if (perChar !== null) return perChar;
  const perSec = num(item.input_cost_per_second);
  if (perSec !== null) return perSec;
  return num(item.input_cost_per_token) ?? 0;
}

export function chatSortOutput(item: Record<string, unknown>): number {
  const slots = item.pricing_slots as PricingSlots | undefined;
  if (slots?.output && slots.output.amount_usd != null) return slotSortValue(slots.output);
  const perChar = num(item.output_cost_per_character);
  if (perChar !== null) return perChar;
  const perSec = num(item.output_cost_per_second);
  if (perSec !== null) return perSec;
  return num(item.output_cost_per_token) ?? 0;
}

export function chatSortCacheRead(item: Record<string, unknown>): number {
  const slots = item.pricing_slots as PricingSlots | undefined;
  if (slots?.cache_read && (slots.cache_read.amount_usd != null || slots.cache_read.unit))
    return slotSortValue(slots.cache_read);
  return num(item.cache_read_input_token_cost) ?? 0;
}

export function chatSortCacheWrite(item: Record<string, unknown>): number {
  const slots = item.pricing_slots as PricingSlots | undefined;
  if (slots?.cache_write && (slots.cache_write.amount_usd != null || slots.cache_write.unit))
    return slotSortValue(slots.cache_write);
  return num(item.cache_creation_input_token_cost) ?? 0;
}
