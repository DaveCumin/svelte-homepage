<script lang="ts">
	const STORAGE_KEY = 'editor.html';
	const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Page</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: linear-gradient(135deg,#667eea,#764ba2); color: white; text-align: center; }
    h1 { font-size: 3em; margin-bottom: 20px; }
    button { padding: 12px 30px; font-size: 1.1em; background: white; color: #667eea; border: none; border-radius: 50px; cursor: pointer; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>Hello World! 👋</h1>
  <p>This is a live preview. Edit the code on the left.</p>
  <button onclick="alert('Hello from your custom page!')">Click me</button>
</body>
</html>`;

	const initialCode = load();
	let code = $state<string>(initialCode);
	let split = $state<number>(50);
	let iframeEl: HTMLIFrameElement | undefined = $state();
	let fileInputEl: HTMLInputElement | undefined = $state();
	let lastSavedSnapshot = $state<string>(initialCode);

	const charCount = $derived(code.length);
	const wordCount = $derived(code.trim() ? code.trim().split(/\s+/).length : 0);
	const isDirty = $derived(code !== lastSavedSnapshot);

	function load(): string {
		if (typeof localStorage === 'undefined') return DEFAULT_HTML;
		return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_HTML;
	}

	$effect(() => {
		if (iframeEl) iframeEl.srcdoc = code;
		try {
			localStorage.setItem(STORAGE_KEY, code);
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
		const blob = new Blob([code], { type: 'text/html' });
		triggerDownload(blob, 'page.html');
		lastSavedSnapshot = code;
	}

	function loadFile() {
		if (isDirty && !confirm('Replace current HTML? Unsaved changes will be lost.')) return;
		fileInputEl?.click();
	}

	async function onFileChosen(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const text = await file.text();
		code = text;
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
			<div class="status">{charCount} chars / {wordCount} words{isDirty ? ' •' : ''}</div>
		</div>
		<input
			bind:this={fileInputEl}
			type="file"
			accept=".html,.htm,text/html"
			onchange={onFileChosen}
			hidden
		/>
		<textarea bind:value={code} spellcheck="false"></textarea>
	</div>
	<div class="resize-handle" onmousedown={handleResize} role="separator" aria-orientation="vertical"></div>
	<div class="panel right" style="width: {100 - split}%;">
		<iframe bind:this={iframeEl} sandbox="allow-scripts allow-modals" title="HTML preview"></iframe>
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
		padding: 0 4px;
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
	iframe {
		flex: 1 1 auto;
		min-height: 0;
		border: none;
		background: #fff;
	}
	.resize-handle {
		flex: 0 0 auto;
		width: 8px;
		cursor: ew-resize;
		background: linear-gradient(90deg, #4448, #fff4, #4448);
		z-index: 2;
	}
</style>
