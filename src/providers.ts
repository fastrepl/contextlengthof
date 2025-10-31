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

/**
 * Get the logo URL for a provider from the LiteLLM GitHub repository
 * Returns null if no logo is available for the provider
 */
export function getProviderLogo(provider: string): string | null {
  if (!provider) return null;
  
  // Map provider names to their logo filenames in the LiteLLM repo (actual files from GitHub)
  const providerLogoMap: { [key: string]: string } = {
    "openai": "openai_small.svg",
    "azure": "microsoft_azure.svg",
    "anthropic": "anthropic.svg",
    "bedrock": "bedrock.svg",
    "vertex_ai": "google.svg",
    "vertexai": "google.svg",
    "cohere": "cohere.svg",
    "groq": "groq.svg",
    "mistral": "mistral.svg",
    "deepinfra": "deepinfra.png",
    "databricks": "databricks.svg",
    "fireworks_ai": "fireworks.svg",
    "fireworks": "fireworks.svg",
    "ollama": "ollama.svg",
    "openrouter": "openrouter.svg",
    "deepseek": "deepseek.svg",
    "cerebras": "cerebras.svg",
    "oracle": "oracle.svg",
    "text-completion-openai": "openai_small.svg",
    "text-completion-codestral": "mistral.svg",
    "codestral": "mistral.svg",
    "sagemaker": "aws.svg",
    "aws": "aws.svg",
    "google": "google.svg",
    "gemini": "google.svg",
  };

  const lowerProvider = provider.toLowerCase();
  const logoFilename = providerLogoMap[lowerProvider];
  
  if (logoFilename) {
    return `https://raw.githubusercontent.com/BerriAI/litellm/main/ui/litellm-dashboard/public/assets/logos/${logoFilename}`;
  }
  
  return null;
}

