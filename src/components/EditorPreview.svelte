<script lang="ts">
	import HtmlMode from './modes/HtmlMode.svelte';
	import MarkdownMode from './modes/MarkdownMode.svelte';
	import DiffMode from './modes/DiffMode.svelte';
	import CanvasMode from './modes/CanvasMode.svelte';

	type Mode = 'html' | 'markdown' | 'diff' | 'canvas';

	const STORAGE_KEY = 'editor.activeMode';
	const tabs: { id: Mode; label: string }[] = [
		{ id: 'html', label: 'HTML' },
		{ id: 'markdown', label: 'Markdown' },
		{ id: 'diff', label: 'Diff' },
		{ id: 'canvas', label: 'Canvas' }
	];

	let active: Mode = $state(loadInitial());

	function loadInitial(): Mode {
		if (typeof localStorage === 'undefined') return 'html';
		const v = localStorage.getItem(STORAGE_KEY);
		return v === 'markdown' || v === 'diff' || v === 'canvas' ? v : 'html';
	}

	function setActive(id: Mode) {
		active = id;
		try {
			localStorage.setItem(STORAGE_KEY, id);
		} catch {
			// localStorage may be disabled; ignore
		}
	}
</script>

<div class="overlay-root">
	<div class="toolbar" role="tablist">
		{#each tabs as tab (tab.id)}
			<button
				role="tab"
				aria-selected={active === tab.id}
				class="tab"
				class:active={active === tab.id}
				onclick={() => setActive(tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</div>
	<div class="mode-panel">
		{#if active === 'html'}
			<HtmlMode />
		{:else if active === 'markdown'}
			<MarkdownMode />
		{:else if active === 'diff'}
			<DiffMode />
		{:else if active === 'canvas'}
			<CanvasMode />
		{/if}
	</div>
</div>

<style>
	.overlay-root {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		min-height: 0;
		background: rgba(30, 34, 44, 0.92);
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 4px 32px #0004;
		border: 1.5px solid #fff2;
	}
	.toolbar {
		flex: 0 0 auto;
		display: flex;
		gap: 4px;
		padding: 6px 10px;
		background: rgba(44, 52, 64, 0.96);
		border-bottom: 1px solid #222a;
	}
	.tab {
		appearance: none;
		background: transparent;
		color: #cfd6e2;
		border: 1px solid transparent;
		border-radius: 6px;
		padding: 6px 14px;
		font: inherit;
		font-size: 0.95em;
		font-weight: 500;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			border-color 0.15s;
	}
	.tab:hover {
		background: rgba(255, 255, 255, 0.06);
		color: #fff;
	}
	.tab.active {
		background: rgba(102, 126, 234, 0.22);
		color: #fff;
		border-color: rgba(102, 126, 234, 0.55);
	}
	.mode-panel {
		flex: 1 1 auto;
		min-height: 0;
		display: flex;
		overflow: hidden;
	}
</style>
