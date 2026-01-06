<script lang="ts">
  let showModal = false;
  let requestType: "provider" | "endpoint" | "model" | "" = "";
  let request = "";
  let docsLink = "";
  let email = "";
  let isSubmitting = false;
  let submitSuccess = false;
  let submitError = "";

  // Zapier webhook URL
  const ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/16331268/uwas519/";

  export function openModal() {
    showModal = true;
    submitSuccess = false;
    submitError = "";
  }

  function closeModal() {
    showModal = false;
    requestType = "";
    request = "";
    docsLink = "";
    email = "";
    submitSuccess = false;
    submitError = "";
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    
    if (!requestType || !request.trim() || !email.trim()) {
      submitError = "Please fill in all required fields";
      return;
    }

    isSubmitting = true;
    submitError = "";

    try {
      const response = await fetch(ZAPIER_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: requestType,
          request: request,
          docsLink: docsLink,
          email: email,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        submitSuccess = true;
        setTimeout(() => {
          closeModal();
        }, 2500);
      } else {
        submitError = "Failed to submit request. Please try again.";
      }
    } catch (error) {
      submitError = "Network error. Please check your connection and try again.";
      console.error("Submission error:", error);
    } finally {
      isSubmitting = false;
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }

  function getPlaceholder() {
    if (requestType === "provider") {
      return "Describe the provider and endpoint you need...";
    } else if (requestType === "endpoint") {
      return "Describe the new endpoint you want added...";
    } else if (requestType === "model") {
      return "Describe the model you need...";
    }
    return "Describe what you need...";
  }

  function getDocsPlaceholder() {
    if (requestType === "provider") {
      return "https://docs.provider.com/api";
    } else if (requestType === "endpoint") {
      return "https://docs.example.com/endpoint";
    } else if (requestType === "model") {
      return "https://docs.example.com/model";
    }
    return "https://...";
  }
</script>

{#if showModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-backdrop" on:click={handleBackdropClick}>
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h2>Request New Model, Provider, Endpoint</h2>
          <p class="subtitle">Help us prioritize what to add next. We'll notify you when it's live!</p>
        </div>
        <button class="close-button" on:click={closeModal} type="button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {#if submitSuccess}
        <div class="success-message">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <h3>Request Submitted!</h3>
          <p>We'll notify you at <strong>{email}</strong> when this is live.</p>
        </div>
      {:else}
        <form on:submit={handleSubmit}>
          <div class="form-group">
            <label>What are you requesting? <span class="required">*</span></label>
            <div class="type-selector">
              <button
                type="button"
                class="type-button"
                class:selected={requestType === "provider"}
                on:click={() => requestType = "provider"}
                disabled={isSubmitting}
              >
                <div class="type-label">Provider</div>
                <div class="type-example">e.g., AWS Polly, Azure OpenAI</div>
              </button>
              <button
                type="button"
                class="type-button"
                class:selected={requestType === "endpoint"}
                on:click={() => requestType = "endpoint"}
                disabled={isSubmitting}
              >
                <div class="type-label">Endpoint</div>
                <div class="type-example">e.g., /v1/interactions, /v1/realtime</div>
              </button>
              <button
                type="button"
                class="type-button"
                class:selected={requestType === "model"}
                on:click={() => requestType = "model"}
                disabled={isSubmitting}
              >
                <div class="type-label">Model</div>
                <div class="type-example">e.g., GPT-4 Turbo, Claude 3.5</div>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="request">
              What do you need? <span class="required">*</span>
            </label>
            
            {#if requestType === "provider"}
              <div class="examples-box">
                <div class="example-title">Examples:</div>
                <ul>
                  <li>Add AWS Polly on /audio/transcriptions endpoint (OpenAI Compatible)</li>
                  <li>Support /v1/batch endpoint for Anthropic Claude models</li>
                </ul>
              </div>
            {:else if requestType === "endpoint"}
              <div class="examples-box">
                <div class="example-title">Examples:</div>
                <ul>
                  <li>Add support for /v1/interactions endpoint (new endpoint type)</li>
                  <li>Add Google generateContent and streamGenerateContent endpoints</li>
                  <li>Add /rag/ingest, managed RAG API to allow combining chunking, OCR, embeddings and creating vector stores</li>
                </ul>
              </div>
            {:else if requestType === "model"}
              <div class="examples-box">
                <div class="example-title">Examples:</div>
                <ul>
                  <li>Add GPT-4 Turbo with 128K context window</li>
                  <li>Support for Claude 3.5 Sonnet latest version</li>
                </ul>
              </div>
            {/if}

            <textarea
              id="request"
              bind:value={request}
              placeholder={getPlaceholder()}
              rows="3"
              required
              disabled={isSubmitting}
            ></textarea>
            <span class="hint">Be specific! The more details, the faster we can add it.</span>
          </div>

          <div class="form-group">
            <label for="docsLink">
              Documentation link <span class="optional">(optional but helpful!)</span>
            </label>
            <input
              id="docsLink"
              type="url"
              bind:value={docsLink}
              placeholder={getDocsPlaceholder()}
              disabled={isSubmitting}
            />
          </div>

          <div class="form-group">
            <label for="email">
              Your email <span class="required">*</span>
            </label>
            <input
              id="email"
              type="email"
              bind:value={email}
              placeholder="your.email@example.com"
              required
              disabled={isSubmitting}
            />
            <span class="hint">We'll let you know when it's ready!</span>
          </div>

          {#if submitError}
            <div class="error-message">
              {submitError}
            </div>
          {/if}

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" on:click={closeModal} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
              {#if isSubmitting}
                <span class="spinner"></span>
                Submitting...
              {:else}
                Submit Request
              {/if}
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    background: #ffffff;
    border-radius: 16px;
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 2rem 2rem 1rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .modal-header h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1.2;
  }

  .subtitle {
    margin: 0;
    font-size: 0.9375rem;
    color: #6b7280;
    line-height: 1.5;
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    color: #9ca3af;
    transition: color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }

  .close-button:hover {
    color: #1a1a1a;
    background-color: #f3f4f6;
  }

  form {
    padding: 2rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.625rem;
    font-weight: 600;
    font-size: 0.9375rem;
    color: #1a1a1a;
  }

  .required {
    color: #ef4444;
    font-weight: 600;
  }

  .optional {
    font-weight: 400;
    color: #9ca3af;
    font-size: 0.875rem;
  }

  .hint {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.8125rem;
    color: #6b7280;
  }

  .examples-box {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-bottom: 0.75rem;
  }

  .example-title {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .examples-box ul {
    margin: 0;
    padding-left: 1.25rem;
    list-style-type: disc;
  }

  .examples-box li {
    font-size: 0.875rem;
    color: #4b5563;
    line-height: 1.6;
    margin-bottom: 0.375rem;
  }

  .examples-box li:last-child {
    margin-bottom: 0;
  }

  .type-selector {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .type-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem 0.75rem;
    background: #ffffff;
    border: 2px solid #d1d5db;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    text-align: center;
  }

  .type-button:hover:not(:disabled):not(.selected) {
    border-color: #9ca3af;
    background: #fafafa;
  }

  .type-button:focus {
    outline: none;
  }

  .type-button.selected {
    background: #000 !important;
    border-color: #000 !important;
    color: white;
  }

  .type-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .type-label {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 0.375rem;
  }

  .type-button.selected .type-label {
    color: white !important;
  }

  .type-example {
    font-size: 0.75rem;
    color: #6b7280;
    line-height: 1.4;
  }

  .type-button.selected .type-example {
    color: rgba(255, 255, 255, 0.75) !important;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
    transition: all 0.2s ease;
    box-sizing: border-box;
    background: #ffffff;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 90px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.5;
  }

  .form-group input:hover:not(:disabled),
  .form-group textarea:hover:not(:disabled) {
    border-color: #9ca3af;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #000;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
  }

  .form-group input::placeholder,
  .form-group textarea::placeholder {
    color: #9ca3af;
  }

  .form-group input:disabled,
  .form-group textarea:disabled {
    background-color: #f9fafb;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #f3f4f6;
  }

  .btn {
    padding: 0.875rem 1.75rem;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 100px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background-color: #000;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #333;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .btn-secondary {
    background-color: transparent;
    color: #6b7280;
    border: 2px solid #e5e7eb;
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: #f9fafb;
    border-color: #d1d5db;
    color: #1a1a1a;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-message {
    padding: 1rem 1.25rem;
    background-color: #fef2f2;
    border: 2px solid #fecaca;
    border-radius: 10px;
    color: #dc2626;
    font-size: 0.9375rem;
    margin-bottom: 1rem;
    font-weight: 500;
  }

  .success-message {
    padding: 3rem 2rem;
    text-align: center;
    animation: slideUp 0.3s ease;
  }

  .success-message svg {
    margin: 0 auto 1.5rem;
    display: block;
  }

  .success-message h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: #10b981;
  }

  .success-message p {
    margin: 0;
    color: #6b7280;
    font-size: 1.0625rem;
    line-height: 1.6;
  }

  .success-message strong {
    color: #1a1a1a;
    font-weight: 600;
  }

  @media (max-width: 640px) {
    .modal-content {
      max-height: 95vh;
      border-radius: 12px;
    }

    .modal-header {
      padding: 1.5rem 1.5rem 1rem;
    }

    .modal-header h2 {
      font-size: 1.5rem;
    }

    .subtitle {
      font-size: 0.875rem;
    }

    form {
      padding: 1.5rem;
    }

    .type-selector {
      grid-template-columns: 1fr;
    }

    .form-actions {
      flex-direction: column-reverse;
    }

    .btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
