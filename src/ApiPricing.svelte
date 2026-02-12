<script lang="ts">
  let copiedEndpoint: string | null = null;

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      copiedEndpoint = id;
      setTimeout(() => { copiedEndpoint = null; }, 2000);
    });
  }
</script>

<main class="container">
  <div class="hero">
    <h1 class="hero-title">API Model Pricing</h1>
    <p class="hero-subtitle">
      Query LiteLLM's model pricing &amp; context window data programmatically
    </p>
    <div class="cta-buttons">
      <a
        href="https://api.litellm.ai/docs"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-primary"
      >
        Interactive API Docs →
      </a>
    </div>
  </div>

  <div class="content">
    <section class="section">
      <h2 class="section-title">Base URL</h2>
      <div class="base-url-block">
        <code>https://api.litellm.ai</code>
      </div>
      <p class="section-desc">No authentication required. All endpoints are publicly accessible.</p>
    </section>

    <!-- Endpoint 1 -->
    <section class="section">
      <h2 class="section-title">
        <span class="method-badge">GET</span>
        /model_catalog
      </h2>
      <p class="section-desc">List and filter models. Returns pricing, context windows, and capability metadata.</p>

      <h3 class="subsection-title">Query Parameters</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Type</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>provider</code></td><td>string</td><td>Filter by provider (e.g. <code>openai</code>, <code>anthropic</code>, <code>vertex_ai</code>)</td></tr>
            <tr><td><code>model</code></td><td>string</td><td>Search by model name (partial match)</td></tr>
            <tr><td><code>mode</code></td><td>string</td><td>Filter by mode (e.g. <code>chat</code>, <code>embedding</code>, <code>completion</code>)</td></tr>
            <tr><td><code>supports_vision</code></td><td>boolean</td><td>Filter models that support vision</td></tr>
            <tr><td><code>supports_function_calling</code></td><td>boolean</td><td>Filter models that support function calling</td></tr>
            <tr><td><code>supports_tool_choice</code></td><td>boolean</td><td>Filter models that support tool choice</td></tr>
            <tr><td><code>supports_response_schema</code></td><td>boolean</td><td>Filter models that support response schema</td></tr>
            <tr><td><code>limit</code></td><td>integer</td><td>Number of results to return (default: 50)</td></tr>
            <tr><td><code>offset</code></td><td>integer</td><td>Offset for pagination</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="subsection-title">Example</h3>
      <div class="code-block">
        <div class="code-header">
          <span>curl</span>
          <button class="copy-btn" on:click={() => copyToClipboard("curl 'https://api.litellm.ai/model_catalog?provider=openai&mode=chat&limit=2'", 'e1')}>
            {copiedEndpoint === 'e1' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre><code>curl 'https://api.litellm.ai/model_catalog?provider=openai&mode=chat&limit=2'</code></pre>
      </div>

      <div class="code-block">
        <div class="code-header"><span>Response</span></div>
        <pre><code>{JSON.stringify({
  data: [
    {
      model: "gpt-4o",
      provider: "openai",
      mode: "chat",
      max_input_tokens: 128000,
      max_output_tokens: 16384,
      input_cost_per_token: 0.0000025,
      output_cost_per_token: 0.00001,
      supports_vision: true,
      supports_function_calling: true
    },
    {
      model: "gpt-4o-mini",
      provider: "openai",
      mode: "chat",
      max_input_tokens: 128000,
      max_output_tokens: 16384,
      input_cost_per_token: 1.5e-7,
      output_cost_per_token: 6e-7,
      supports_vision: true,
      supports_function_calling: true
    }
  ],
  total: 150,
  limit: 2,
  offset: 0
}, null, 2)}</code></pre>
      </div>
    </section>

    <!-- Endpoint 2 -->
    <section class="section">
      <h2 class="section-title">
        <span class="method-badge">GET</span>
        /model_catalog/{'{model_id}'}
      </h2>
      <p class="section-desc">Get detailed information for a single model by its ID.</p>

      <h3 class="subsection-title">Example</h3>
      <div class="code-block">
        <div class="code-header">
          <span>curl</span>
          <button class="copy-btn" on:click={() => copyToClipboard("curl 'https://api.litellm.ai/model_catalog/gpt-4o'", 'e2')}>
            {copiedEndpoint === 'e2' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre><code>curl 'https://api.litellm.ai/model_catalog/gpt-4o'</code></pre>
      </div>

      <div class="code-block">
        <div class="code-header"><span>Response</span></div>
        <pre><code>{JSON.stringify({
  model: "gpt-4o",
  provider: "openai",
  mode: "chat",
  max_input_tokens: 128000,
  max_output_tokens: 16384,
  input_cost_per_token: 0.0000025,
  output_cost_per_token: 0.00001,
  cache_read_input_token_cost: 0.00000125,
  supports_vision: true,
  supports_function_calling: true,
  supports_tool_choice: true,
  supports_response_schema: true
}, null, 2)}</code></pre>
      </div>
    </section>

    <!-- More examples -->
    <section class="section">
      <h2 class="section-title">More Examples</h2>

      <div class="example-grid">
        <div class="example-card">
          <h4>Filter by vision support</h4>
          <div class="code-inline">
            <code>GET /model_catalog?supports_vision=true&limit=10</code>
          </div>
        </div>
        <div class="example-card">
          <h4>Get all Anthropic models</h4>
          <div class="code-inline">
            <code>GET /model_catalog?provider=anthropic</code>
          </div>
        </div>
        <div class="example-card">
          <h4>Search by model name</h4>
          <div class="code-inline">
            <code>GET /model_catalog?model=claude</code>
          </div>
        </div>
        <div class="example-card">
          <h4>Embedding models only</h4>
          <div class="code-inline">
            <code>GET /model_catalog?mode=embedding</code>
          </div>
        </div>
      </div>
    </section>

    <section class="section cta-section">
      <p>
        For the full interactive API documentation with try-it-out functionality, visit
        <a href="https://api.litellm.ai/docs" target="_blank" rel="noopener noreferrer">api.litellm.ai/docs</a>.
      </p>
    </section>
  </div>
</main>

<style>
  .container {
    background-color: var(--bg-color);
    color: var(--text-color);
  }

  .hero {
    text-align: center;
    padding: 5rem 2rem 3rem;
    max-width: 900px;
    margin: 0 auto;
  }

  .hero-title {
    font-size: 4rem;
    font-weight: 700;
    line-height: 1.1;
    margin: 0 0 1.25rem 0;
    color: var(--text-color);
    letter-spacing: -0.03em;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    line-height: 1.5;
    color: var(--muted-color);
    margin: 0 0 2rem 0;
    max-width: 700px;
    margin-left: auto;
    margin-right: auto;
  }

  .cta-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    padding: 0.875rem 2rem;
    font-size: 1rem;
    font-weight: 500;
    border-radius: 100px;
    text-decoration: none;
    transition: all 0.2s ease;
    border: 1px solid transparent;
    cursor: pointer;
  }

  .btn-primary {
    background-color: var(--text-color);
    color: var(--bg-color);
    border-color: var(--text-color);
  }

  .btn-primary:hover {
    opacity: 0.85;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .content {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 2rem 4rem;
  }

  .section {
    margin-bottom: 3rem;
  }

  .section-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 0.75rem 0;
    color: var(--text-color);
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .section-desc {
    color: var(--muted-color);
    font-size: 1rem;
    line-height: 1.6;
    margin: 0 0 1.5rem 0;
  }

  .subsection-title {
    font-size: 1rem;
    font-weight: 600;
    margin: 1.5rem 0 0.75rem 0;
    color: var(--text-secondary);
  }

  .base-url-block {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-bottom: 0.75rem;
  }

  .base-url-block code {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--litellm-primary);
  }

  .method-badge {
    display: inline-block;
    background: #22c55e;
    color: #fff;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.25rem 0.625rem;
    border-radius: 4px;
    letter-spacing: 0.02em;
    font-family: monospace;
  }

  .table-container {
    overflow-x: auto;
    margin-bottom: 1.5rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--card-bg);
    border-radius: 8px;
    border: 1px solid var(--border-color);
    overflow: hidden;
  }

  thead {
    background: var(--bg-secondary);
  }

  th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.8125rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted-color);
    border-bottom: 1px solid var(--border-color);
  }

  td {
    padding: 0.625rem 1rem;
    font-size: 0.9375rem;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-color);
  }

  tr:last-child td {
    border-bottom: none;
  }

  td code {
    background: var(--bg-tertiary);
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-size: 0.875rem;
    color: var(--litellm-primary);
  }

  .code-block {
    background: var(--code-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 1rem;
  }

  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--muted-color);
  }

  .copy-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
    color: var(--muted-color);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .copy-btn:hover {
    border-color: var(--border-color-strong);
    color: var(--text-color);
  }

  .code-block pre {
    margin: 0;
    padding: 1rem;
    overflow-x: auto;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--code-text);
  }

  .code-block code {
    display: block;
    background: transparent !important;
    padding: 0 !important;
    border-radius: 0 !important;
    color: inherit !important;
    font-size: inherit;
  }

  .example-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .example-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem 1.25rem;
  }

  .example-card h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color);
  }

  .code-inline code {
    font-size: 0.8125rem;
    color: var(--muted-color);
    word-break: break-all;
  }

  .cta-section {
    text-align: center;
    padding: 2rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
  }

  .cta-section p {
    margin: 0;
    color: var(--muted-color);
    font-size: 1rem;
  }

  .cta-section a {
    color: var(--link-color);
    font-weight: 500;
  }

  .cta-section a:hover {
    color: var(--link-hover);
  }

  @media (max-width: 768px) {
    .hero {
      padding: 2rem 1rem;
    }

    .hero-title {
      font-size: 2.5rem;
    }

    .content {
      padding: 0 1rem 3rem;
    }

    .example-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
