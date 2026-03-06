<script lang="ts">
  import { onDestroy, tick } from "svelte";
  import { fly } from "svelte/transition";
  import { getProviderInitial, getProviderLogo } from "./providers";

  export let providers: string[] = [];
  export let selectedProvider = "";

  let isOpen = false;
  let searchQuery = "";
  let activeIndex = 0;
  let rootElement: HTMLDivElement;
  let triggerButton: HTMLButtonElement;
  let searchInput: HTMLInputElement;

  $: options = ["", ...providers];
  $: filteredProviders = options.filter((provider) =>
    provider.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  $: if (!isOpen) {
    activeIndex = Math.max(
      0,
      filteredProviders.findIndex((provider) => provider === selectedProvider),
    );
  }

  function open() {
    isOpen = true;
    searchQuery = "";
    activeIndex = Math.max(
      0,
      filteredProviders.findIndex((provider) => provider === selectedProvider),
    );

    tick().then(() => {
      searchInput?.focus();
    });
  }

  function close() {
    isOpen = false;
    searchQuery = "";
    triggerButton?.focus();
  }

  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  function select(provider: string) {
    selectedProvider = provider;
    isOpen = false;
    searchQuery = "";
    triggerButton?.focus();
  }

  function moveActiveIndex(step: number) {
    if (!filteredProviders.length) return;

    activeIndex = (activeIndex + step + filteredProviders.length) % filteredProviders.length;
    const activeOption = document.getElementById(getOptionId(filteredProviders[activeIndex]));
    activeOption?.scrollIntoView({ block: "nearest" });
  }

  function getOptionId(provider: string) {
    return `provider-option-${(provider || "all").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  function handleTriggerKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        open();
      } else {
        moveActiveIndex(1);
      }
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        open();
      } else {
        moveActiveIndex(-1);
      }
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      close();
    }
  }

  function handleSearchKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveIndex(1);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveIndex(-1);
    }

    if (event.key === "Enter" && filteredProviders[activeIndex] !== undefined) {
      event.preventDefault();
      select(filteredProviders[activeIndex]);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  function handleDocumentClick(event: MouseEvent) {
    const target = event.target as Node;
    if (isOpen && rootElement && !rootElement.contains(target)) {
      isOpen = false;
      searchQuery = "";
    }
  }

  if (typeof document !== "undefined") {
    document.addEventListener("click", handleDocumentClick);
  }

  onDestroy(() => {
    if (typeof document !== "undefined") {
      document.removeEventListener("click", handleDocumentClick);
    }
  });
</script>

<div class="provider-dropdown" bind:this={rootElement}>
  <button
    bind:this={triggerButton}
    class="dropdown-trigger"
    on:click|stopPropagation={toggle}
    on:keydown={handleTriggerKeydown}
    type="button"
    aria-expanded={isOpen}
    aria-haspopup="listbox"
    aria-controls="provider-listbox"
  >
    <div class="dropdown-trigger-content">
      {#if selectedProvider}
        <div class="selected-provider">
          {#if getProviderLogo(selectedProvider)}
            <img src={getProviderLogo(selectedProvider)} alt={selectedProvider} class="provider-logo" />
          {:else}
            <div class="provider-avatar">{getProviderInitial(selectedProvider)}</div>
          {/if}
          <span class="provider-name">{selectedProvider}</span>
        </div>
      {:else}
        <span class="placeholder">All Providers</span>
      {/if}
    </div>
    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" class="dropdown-arrow" class:open={isOpen}>
      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>

  {#if isOpen}
    <div class="dropdown-menu" transition:fly={{ y: -10, duration: 200 }}>
      <div class="dropdown-search">
        <input
          bind:this={searchInput}
          type="text"
          bind:value={searchQuery}
          placeholder="Search providers..."
          class="search-input"
          on:click|stopPropagation
          on:keydown={handleSearchKeydown}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="provider-listbox"
          aria-activedescendant={filteredProviders[activeIndex] !== undefined ? getOptionId(filteredProviders[activeIndex]) : undefined}
        />
      </div>
      <div class="dropdown-status">
        {filteredProviders.length} provider{filteredProviders.length === 1 ? "" : "s"}
      </div>
      <div class="dropdown-options" id="provider-listbox" role="listbox" aria-label="Providers">
        {#each filteredProviders as provider, indexValue}
          <button
            id={getOptionId(provider)}
            class="dropdown-option"
            class:selected={selectedProvider === provider}
            class:active={activeIndex === indexValue}
            type="button"
            role="option"
            aria-selected={selectedProvider === provider}
            on:mouseenter={() => {
              activeIndex = indexValue;
            }}
            on:click={() => select(provider)}
          >
            {#if provider}
              {#if getProviderLogo(provider)}
                <img src={getProviderLogo(provider)} alt={provider} class="provider-logo" />
              {:else}
                <div class="provider-avatar">{getProviderInitial(provider)}</div>
              {/if}
              <span class="provider-name">{provider}</span>
            {:else}
              <span>All Providers</span>
            {/if}
          </button>
        {/each}
        {#if filteredProviders.length === 0}
          <div class="no-results">No providers found</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .provider-dropdown {
    position: relative;
    min-width: 240px;
  }

  .dropdown-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    font-size: 0.9375rem;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background-color: var(--bg-color);
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
    color: var(--text-color);
    height: 44px;
    box-sizing: border-box;
  }

  .dropdown-trigger:hover {
    border-color: var(--muted-color);
  }

  .dropdown-trigger:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .dropdown-trigger-content {
    flex: 1;
    text-align: left;
    min-width: 0;
  }

  .selected-provider {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .provider-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .placeholder {
    color: var(--muted-color);
  }

  .dropdown-arrow {
    color: var(--muted-color);
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .dropdown-arrow.open {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    right: 0;
    background-color: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
    z-index: 9999;
    max-height: 420px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .dropdown-search {
    padding: 0.875rem 0.875rem 0.625rem;
    border-bottom: 1px solid var(--border-color);
    background-color: var(--card-bg);
  }

  .dropdown-status {
    padding: 0.5rem 0.875rem 0;
    font-size: 0.75rem;
    color: var(--muted-color);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
  }

  .search-input {
    width: 100%;
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background-color: var(--bg-color);
    color: var(--text-color);
    transition: all 0.2s ease;
  }

  .search-input:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .search-input::placeholder {
    color: var(--muted-color);
  }

  .dropdown-options {
    overflow-y: auto;
    max-height: 340px;
    padding: 0.25rem 0;
    background-color: var(--card-bg);
  }

  .dropdown-option {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: none;
    background: none;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
    color: var(--text-color);
    font-family: inherit;
    font-size: 0.9375rem;
  }

  .dropdown-option:hover,
  .dropdown-option.active {
    background-color: var(--hover-bg);
  }

  .dropdown-option.selected {
    background-color: var(--bg-tertiary);
    color: var(--litellm-primary);
    font-weight: 600;
  }

  .dropdown-option.selected:hover,
  .dropdown-option.selected.active {
    background-color: var(--bg-tertiary);
  }

  .provider-logo {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: contain;
    background-color: #ffffff;
    padding: 3px;
    flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .provider-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: var(--text-color);
    color: var(--bg-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.65rem;
    flex-shrink: 0;
  }

  .no-results {
    padding: 2rem 1rem;
    text-align: center;
    color: var(--muted-color);
    font-size: 0.875rem;
  }

  .dropdown-options::-webkit-scrollbar {
    width: 8px;
  }

  .dropdown-options::-webkit-scrollbar-track {
    background: transparent;
  }

  .dropdown-options::-webkit-scrollbar-thumb {
    background: var(--border-color-strong);
    border-radius: 4px;
  }

  .dropdown-options::-webkit-scrollbar-thumb:hover {
    background: var(--muted-color);
  }

  @media (max-width: 768px) {
    .provider-dropdown {
      width: 100%;
      min-width: auto;
    }
  }
</style>

