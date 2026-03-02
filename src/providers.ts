/**
 * Provider utility functions for mapping provider names to logos and initials
 */

/**
 * Get the initial/abbreviation for a provider name
 */
export function getProviderInitial(provider: string): string {
  if (!provider) return "?";
  
  // Map common providers to their initials/abbreviations
  const providerMap: { [key: string]: string } = {
    "anthropic": "A",
    "openai": "O",
    "azure": "Az",
    "bedrock": "B",
    "vertex_ai": "V",
    "cohere": "C",
    "huggingface": "H",
    "replicate": "R",
    "groq": "G",
    "together_ai": "T",
    "mistral": "M",
    "deepinfra": "D",
  };

  const lowerProvider = provider.toLowerCase();
  if (providerMap[lowerProvider]) {
    return providerMap[lowerProvider];
  }
  
  // Default to first letter uppercase
  return provider.charAt(0).toUpperCase();
}

const LOBEHUB_CDN = "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@latest/icons";
const LITELLM_LOGOS = "https://raw.githubusercontent.com/BerriAI/litellm/main/ui/litellm-dashboard/public/assets/logos";

/**
 * Get the logo URL for a provider.
 * Uses LobeHub icon CDN for most providers, falls back to LiteLLM repo for a few.
 * Returns null if no logo is available.
 */
export function getProviderLogo(provider: string): string | null {
  if (!provider) return null;

  const lobehubMap: { [key: string]: string } = {
    "openai": "openai.svg",
    "azure": "azure.svg",
    "azure_ai": "azureai.svg",
    "azure_text": "azure.svg",
    "anthropic": "anthropic.svg",
    "bedrock": "bedrock.svg",
    "bedrock_converse": "bedrock.svg",
    "vertex_ai": "google.svg",
    "vertexai": "google.svg",
    "cohere": "cohere.svg",
    "cohere_chat": "cohere.svg",
    "groq": "groq.svg",
    "mistral": "mistral.svg",
    "deepinfra": "deepinfra.svg",
    "fireworks_ai": "fireworks.svg",
    "fireworks": "fireworks.svg",
    "ollama": "ollama.svg",
    "openrouter": "openrouter.svg",
    "deepseek": "deepseek.svg",
    "cerebras": "cerebras.svg",
    "text-completion-openai": "openai.svg",
    "text-completion-codestral": "mistral.svg",
    "codestral": "mistral.svg",
    "sagemaker": "aws.svg",
    "aws": "aws.svg",
    "aws_polly": "aws.svg",
    "google": "google.svg",
    "gemini": "google.svg",
    "google_pse": "google.svg",
    "palm": "palm.svg",
    "ai21": "ai21.svg",
    "aleph_alpha": "alephalpha.svg",
    "anyscale": "anyscale.svg",
    "assemblyai": "assemblyai.svg",
    "cloudflare": "cloudflare.svg",
    "elevenlabs": "elevenlabs.svg",
    "exa_ai": "exa.svg",
    "fal_ai": "fal.svg",
    "featherless_ai": "featherless.svg",
    "friendliai": "friendli.svg",
    "github_copilot": "githubcopilot.svg",
    "huggingface": "huggingface.svg",
    "hyperbolic": "hyperbolic.svg",
    "jina_ai": "jina.svg",
    "lambda_ai": "lambda.svg",
    "meta_llama": "meta.svg",
    "minimax": "minimax.svg",
    "moonshot": "moonshot.svg",
    "morph": "morph.svg",
    "novita": "novita.svg",
    "nvidia_nim": "nvidia.svg",
    "perplexity": "perplexity.svg",
    "recraft": "recraft.svg",
    "replicate": "replicate.svg",
    "runwayml": "runway.svg",
    "sambanova": "sambanova.svg",
    "snowflake": "snowflake.svg",
    "stability": "stability.svg",
    "tavily": "tavily.svg",
    "together_ai": "together.svg",
    "v0": "v0.svg",
    "vercel_ai_gateway": "vercel.svg",
    "volcengine": "volcengine.svg",
    "voyage": "voyage.svg",
    "watsonx": "ibm.svg",
    "xai": "xai.svg",
    "zai": "zai.svg",
    "amazon_nova": "nova.svg",
    "chatgpt": "openai.svg",
    "dashscope": "alibaba.svg",
  };

  const litellmMap: { [key: string]: string } = {
    "databricks": "databricks.svg",
    "oracle": "oracle.svg",
  };

  const lowerProvider = provider.toLowerCase();

  const lobeFile = lobehubMap[lowerProvider];
  if (lobeFile) {
    return `${LOBEHUB_CDN}/${lobeFile}`;
  }

  const litellmFile = litellmMap[lowerProvider];
  if (litellmFile) {
    return `${LITELLM_LOGOS}/${litellmFile}`;
  }

  return null;
}

