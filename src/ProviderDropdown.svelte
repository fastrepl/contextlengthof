<script lang="ts">
  import { fly } from "svelte/transition";
  import { getProviderInitial, getProviderLogo } from "./providers";

  export let providers: string[] = [];
  export let selectedProvider: string = "";

  let isOpen = false;
  let searchQuery = "";

  $: filteredProviders = providers.filter(provider => 
    provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function toggle() {
    isOpen = !isOpen;
    if (isOpen) {
      searchQuery = "";
    }
  }

  function select(provider: string) {
    selectedProvider = provider;
    isOpen = false;
    searchQuery = "";
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.provider-dropdown')) {
      isOpen = false;
    }
  }

  if (typeof window !== 'undefined') {
    document.addEventListener('click', handleClickOutside);
  }
</script>

<div class="provider-dropdown">
  <button 
    class="dropdown-trigger" 
    on:click|stopPropagation={toggle}
    type="button"
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
          type="text"
          bind:value={searchQuery}
          placeholder="Search providers..."
          class="search-input"
          on:click|stopPropagation
          autofocus
        />
      </div>
      <div class="dropdown-options">
        <button
          class="dropdown-option"
          class:selected={!selectedProvider}
          on:click={() => select("")}
          type="button"
        >
          <span>All Providers</span>
        </button>
        {#each filteredProviders as provider}
          <button
            class="dropdown-option"
            class:selected={selectedProvider === provider}
            on:click={() => select(provider)}
            type="button"
          >
            {#if getProviderLogo(provider)}
              <img src={getProviderLogo(provider)} alt={provider} class="provider-logo" />
            {:else}
              <div class="provider-avatar">{getProviderInitial(provider)}</div>
            {/if}
            <span class="provider-name">{provider}</span>
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
    min-width: 280px;
  }

  .dropdown-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    font-size: 1rem;
    border: 1px solid var(--muted-border-color);
    border-radius: 8px;
    background-color: #ffffff;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    color: var(--contrast);
    height: 48px;
    box-sizing: border-box;
  }

  .dropdown-trigger:hover {
    border-color: #6366f1;
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
    background-color: #ffffff;
    border: 1px solid var(--muted-border-color);
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
    z-index: 9999;
    max-height: 420px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .dropdown-search {
    padding: 0.875rem;
    border-bottom: 1px solid var(--muted-border-color);
    background-color: #ffffff;
  }

  .search-input {
    width: 100%;
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
    border: 1px solid var(--muted-border-color);
    border-radius: 6px;
    background-color: #ffffff;
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
    background-color: #ffffff;
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
    color: var(--contrast);
    font-family: inherit;
    font-size: 0.9375rem;
  }

  .dropdown-option:hover {
    background-color: #f5f5f5;
  }

  .dropdown-option.selected {
    background-color: rgba(99, 102, 241, 0.08);
    color: #6366f1;
    font-weight: 500;
  }

  .dropdown-option.selected:hover {
    background-color: rgba(99, 102, 241, 0.12);
  }

  .provider-logo {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: contain;
    background-color: white;
    padding: 3px;
    flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .provider-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: #1a1a1a;
    color: white;
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

  /* Scrollbar styling */
  .dropdown-options::-webkit-scrollbar {
    width: 8px;
  }

  .dropdown-options::-webkit-scrollbar-track {
    background: transparent;
  }

  .dropdown-options::-webkit-scrollbar-thumb {
    background: #d4d4d4;
    border-radius: 4px;
  }

  .dropdown-options::-webkit-scrollbar-thumb:hover {
    background: #a3a3a3;
  }

  @media (max-width: 768px) {
    .provider-dropdown {
      width: 100%;
      min-width: auto;
    }
  }
</style>

