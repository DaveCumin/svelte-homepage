<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	const STORAGE_KEY = 'editor.markdown';
	const DEFAULT_MD = `# Hello, Markdown 👋

This is the **Markdown** mode. Type on the left, see rendered HTML on the right.

## Features

- [x] Headings, lists, emphasis
- [x] Links: [Svelte](https://svelte.dev)
- [x] Code:

\`\`\`js
const greet = (name) => \`Hi \${name}\`;
console.log(greet('world'));
\`\`\`

> Block quotes also work.

| Col A | Col B |
|-------|-------|
|   1   |   2   |
|   3   |   4   |
`;

	const initialMd = load();
	let md = $state<string>(initialMd);
	let split = $state<number>(50);
	let fileInputEl: HTMLInputElement | undefined = $state();
	let lastSavedSnapshot = $state<string>(initialMd);

	const isDirty = $derived(md !== lastSavedSnapshot);

	const rendered = $derived.by(() => {
		if (typeof window === 'undefined') return '';
		const raw = marked.parse(md, { async: false, breaks: true, gfm: true }) as string;
		return DOMPurify.sanitize(raw);
	});

	function load(): string {
		if (typeof localStorage === 'undefined') return DEFAULT_MD;
		return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_MD;
	}

	$effect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, md);
		} catch {
			// ignore
		}
	});

	function triggerDownload(blob: Blob, name: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = name;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function saveFile() {
		const blob = new Blob([md], { type: 'text/markdown' });
		triggerDownload(blob, 'document.md');
		lastSavedSnapshot = md;
	}

	function loadFile() {
		if (isDirty && !confirm('Replace current Markdown? Unsaved changes will be lost.')) return;
		fileInputEl?.click();
	}

	async function onFileChosen(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const text = await file.text();
		md = text;
		lastSavedSnapshot = text;
		input.value = '';
	}

	function handleResize(e: MouseEvent) {
		const startX = e.clientX;
		const startSplit = split;
		function onMove(ev: MouseEvent) {
			const dx = ev.clientX - startX;
			split = Math.max(10, Math.min(90, startSplit + (dx * 100) / window.innerWidth));
		}
		function onUp() {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		}
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}
</script>

<div class="root">
	<div class="panel left" style="width: {split}%;">
		<div class="toolbar">
			<button type="button" class="btn" onclick={loadFile}>Load</button>
			<button type="button" class="btn" onclick={saveFile}>Save</button>
			{#if isDirty}<div class="status">•</div>{/if}
		</div>
		<input
			bind:this={fileInputEl}
			type="file"
			accept=".md,.markdown,text/markdown,text/plain"
			onchange={onFileChosen}
			hidden
		/>
		<textarea bind:value={md} spellcheck="false" placeholder="Type Markdown here…"></textarea>
	</div>
	<div class="resize-handle" onmousedown={handleResize} role="separator" aria-orientation="vertical"></div>
	<div class="panel right" style="width: {100 - split}%;">
		<div class="md-preview">{@html rendered}</div>
	</div>
</div>

<style>
	.root {
		display: flex;
		width: 100%;
		height: 100%;
		min-height: 0;
	}
	.panel {
		display: flex;
		flex-direction: column;
		min-width: 120px;
		min-height: 0;
	}
	.left {
		background: rgba(24, 28, 34, 0.92);
		border-right: 1px solid #fff1;
	}
	.right {
		background: #fff;
	}
	.toolbar {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
		background: rgba(0, 0, 0, 0.25);
		border-bottom: 1px solid #fff1;
	}
	.btn {
		appearance: none;
		background: rgba(255, 255, 255, 0.06);
		color: #cfd6e2;
		border: 1px solid #fff2;
		border-radius: 5px;
		padding: 3px 10px;
		font: inherit;
		font-size: 0.8em;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			border-color 0.15s;
	}
	.btn:hover {
		background: rgba(255, 255, 255, 0.14);
		color: #fff;
		border-color: rgba(102, 126, 234, 0.55);
	}
	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.status {
		flex: 1 1 auto;
		font-size: 0.8em;
		color: #9aa3b2;
		text-align: right;
	}
	textarea {
		flex: 1 1 auto;
		min-height: 0;
		padding: 12px;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 15px;
		line-height: 1.5;
		border: none;
		resize: none;
		background: rgba(24, 28, 34, 0.92);
		color: #e0e0e0;
		outline: none;
	}
	.md-preview {
		flex: 1 1 auto;
		min-height: 0;
		overflow: auto;
		padding: 16px 24px;
		color: #222;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		font-size: 15px;
		line-height: 1.55;
	}
	.md-preview :global(h1) {
		font-size: 1.9em;
		border-bottom: 1px solid #eee;
		padding-bottom: 0.25em;
	}
	.md-preview :global(h2) {
		font-size: 1.5em;
		border-bottom: 1px solid #eee;
		padding-bottom: 0.2em;
	}
	.md-preview :global(code) {
		background: #f4f4f6;
		padding: 0.15em 0.35em;
		border-radius: 4px;
		font-family: 'Consolas', 'Monaco', monospace;
		font-size: 0.92em;
	}
	.md-preview :global(pre) {
		background: #0f1115;
		color: #e6e6e6;
		padding: 12px 14px;
		border-radius: 8px;
		overflow: auto;
	}
	.md-preview :global(pre code) {
		background: transparent;
		padding: 0;
		color: inherit;
	}
	.md-preview :global(blockquote) {
		border-left: 4px solid #ccc;
		margin: 0;
		padding: 0.2em 1em;
		color: #555;
	}
	.md-preview :global(table) {
		border-collapse: collapse;
	}
	.md-preview :global(th),
	.md-preview :global(td) {
		border: 1px solid #ddd;
		padding: 6px 10px;
	}
	.md-preview :global(a) {
		color: #4060d8;
	}
	.resize-handle {
		flex: 0 0 auto;
		width: 8px;
		cursor: ew-resize;
		background: linear-gradient(90deg, #4448, #fff4, #4448);
		z-index: 2;
	}
</style>
