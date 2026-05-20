/**
 * Load models from litellm-model-catalog-api (paginated) and map to the
 * flat item shape the UI expects (name + litellm_provider).
 */

export type PricingSlot = {
  amount_usd: number | null;
  unit: string | null;
  source_field: string | null;
};

export type PricingSlots = {
  input: PricingSlot;
  output: PricingSlot;
  cache_read: PricingSlot;
  cache_write: PricingSlot;
};

export type CatalogApiEntry = {
  id: string;
  provider?: string | null;
  pricing_slots?: PricingSlots;
  [key: string]: unknown;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function asPricingSlot(v: unknown): PricingSlot {
  if (!isRecord(v)) return { amount_usd: null, unit: null, source_field: null };
  const amount = v.amount_usd;
  return {
    amount_usd: typeof amount === "number" ? amount : amount != null ? Number(amount) : null,
    unit: typeof v.unit === "string" ? v.unit : null,
    source_field: typeof v.source_field === "string" ? v.source_field : null,
  };
}

export function normalizePricingSlots(raw: unknown): PricingSlots | undefined {
  if (!isRecord(raw)) return undefined;
  return {
    input: asPricingSlot(raw.input),
    output: asPricingSlot(raw.output),
    cache_read: asPricingSlot(raw.cache_read),
    cache_write: asPricingSlot(raw.cache_write),
  };
}

/** Map one API catalog row to UI item (GitHub JSON shape + pricing_slots). */
export function mapCatalogEntryToItem(entry: CatalogApiEntry): Record<string, unknown> {
  const { id, provider, pricing_slots, object: _object, ...rest } = entry;
  const slots = normalizePricingSlots(pricing_slots);
  return {
    ...rest,
    name: id,
    litellm_provider: (provider as string) ?? (rest.litellm_provider as string) ?? "",
    pricing_slots: slots,
  };
}

/** Format a USD amount exactly as in the catalog — no "<$0.01" floors. */
export function formatExactUsd(n: number, suffix = ""): string {
  if (Number.isNaN(n)) return "—";
  if (n === 0) return "$0.00" + suffix;
  const abs = Math.abs(n);
  const decimals = abs >= 0.01 ? 2 : 10;
  let s = n.toFixed(decimals);
  if (abs < 0.01) {
    s = s.replace(/\.?0+$/, "");
  }
  return "$" + s + suffix;
}

/** Per-token catalog field → exact per-1M-token display. */
export function formatTokenCostPerMillion(perToken: number | null | undefined): string {
  if (perToken === null || perToken === undefined) return "—";
  return formatExactUsd(perToken * 1e6, "/M");
}

export function formatPricingSlot(slot: PricingSlot | undefined): string {
  if (!slot || slot.amount_usd == null || Number.isNaN(slot.amount_usd)) return "—";
  const u = slot.unit ?? "";
  const n = slot.amount_usd;
  if (u === "per_1m_tokens" || u === "per_1m_reasoning_tokens" || u === "per_1m_image_tokens" || u === "per_1m_audio_tokens") {
    return formatExactUsd(n, "/M");
  }
  if (u === "per_image") {
    return formatExactUsd(n, "/img");
  }
  if (u === "per_pixel") {
    return formatExactUsd(n * 1e6, "/Mpx");
  }
  if (u === "per_character") {
    return formatExactUsd(n, "/char");
  }
  if (u === "per_query") {
    return formatExactUsd(n, "/q");
  }
  if (u === "per_request") {
    return formatExactUsd(n, "/req");
  }
  if (u === "per_second" || u === "per_second_video") {
    return formatExactUsd(n, "/s");
  }
  return formatExactUsd(n);
}

export function slotSortValue(slot: PricingSlot | undefined): number {
  if (!slot || slot.amount_usd == null || Number.isNaN(slot.amount_usd)) return 0;
  return slot.amount_usd;
}

export type CatalogFetchResult = {
  models: Record<string, unknown>[];
  /** Present when the API returns it (page 1 of list); schema reference from source JSON. */
  sample_spec: Record<string, unknown> | null;
};

/**
 * Fetch every page from GET /model_catalog (max page_size 500).
 * `baseUrl` should have no trailing slash, e.g. "" for same-origin proxy or "http://127.0.0.1:8000".
 */
export async function fetchAllCatalogModels(baseUrl: string): Promise<CatalogFetchResult> {
  const root = baseUrl.replace(/\/$/, "");
  const all: Record<string, unknown>[] = [];
  let sample_spec: Record<string, unknown> | null = null;
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const path = `/model_catalog?page=${page}&page_size=500`;
    const url = root ? `${root}${path}` : path;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Catalog API ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as {
      data?: CatalogApiEntry[];
      has_more?: boolean;
      sample_spec?: Record<string, unknown> | null;
    };
    if (page === 1 && json.sample_spec != null && typeof json.sample_spec === "object" && !Array.isArray(json.sample_spec)) {
      sample_spec = json.sample_spec;
    }
    const batch = json.data ?? [];
    for (const row of batch) {
      all.push(mapCatalogEntryToItem(row));
    }
    hasMore = Boolean(json.has_more);
    page += 1;
    if (page > 200) break; // safety
  }
  return { models: all, sample_spec };
}
