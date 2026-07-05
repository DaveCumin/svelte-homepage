<script lang="ts">
	type ItemType = 'image' | 'text';
	type CanvasItem = {
		id: string;
		type: ItemType;
		x: number;
		y: number;
		w: number;
		h: number;
		rotation: number; // degrees
		content: string; // data URL for image, plain text for text
	};

	const STORAGE_KEY = 'editor.canvas';

	const initialItems = loadItems();
	let items = $state<CanvasItem[]>(initialItems);
	let camera = $state({ x: 0, y: 0, scale: 1 });
	let selectedId = $state<string | null>(null);
	let editingId = $state<string | null>(null);
	let viewportEl: HTMLDivElement | undefined = $state();
	let fileInputEl: HTMLInputElement | undefined = $state();
	let lastSavedSnapshot = $state<string>(JSON.stringify(initialItems));

	const isDirty = $derived(JSON.stringify(items) !== lastSavedSnapshot);

	function loadItems(): CanvasItem[] {
		if (typeof localStorage === 'undefined') return [];
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return [];
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}

	$effect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
		} catch {
			// quota or serialization errors — skip
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

	function saveJson() {
		const json = JSON.stringify(items, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		triggerDownload(blob, 'canvas.json');
		lastSavedSnapshot = JSON.stringify(items);
	}

	function loadFile() {
		if (isDirty && !confirm('Replace current canvas? Unsaved changes will be lost.')) return;
		fileInputEl?.click();
	}

	function isCanvasItem(v: unknown): v is CanvasItem {
		if (!v || typeof v !== 'object') return false;
		const o = v as Record<string, unknown>;
		return (
			typeof o.id === 'string' &&
			(o.type === 'image' || o.type === 'text') &&
			typeof o.x === 'number' &&
			typeof o.y === 'number' &&
			typeof o.w === 'number' &&
			typeof o.h === 'number' &&
			typeof o.rotation === 'number' &&
			typeof o.content === 'string'
		);
	}

	async function onFileChosen(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			const text = await file.text();
			const parsed = JSON.parse(text);
			if (!Array.isArray(parsed) || !parsed.every(isCanvasItem)) {
				alert('That file is not a valid canvas.json.');
				return;
			}
			items = parsed as CanvasItem[];
			selectedId = null;
			editingId = null;
			lastSavedSnapshot = JSON.stringify(items);
		} catch {
			alert('Could not parse that file as JSON.');
		} finally {
			input.value = '';
		}
	}

	function loadImage(src: string): Promise<HTMLImageElement | null> {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = () => resolve(null);
			img.src = src;
		});
	}

	function drawTextItem(ctx: CanvasRenderingContext2D, item: CanvasItem) {
		// Match the on-screen .text-display style.
		ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
		const r = 4;
		ctx.beginPath();
		ctx.moveTo(r, 0);
		ctx.lineTo(item.w - r, 0);
		ctx.quadraticCurveTo(item.w, 0, item.w, r);
		ctx.lineTo(item.w, item.h - r);
		ctx.quadraticCurveTo(item.w, item.h, item.w - r, item.h);
		ctx.lineTo(r, item.h);
		ctx.quadraticCurveTo(0, item.h, 0, item.h - r);
		ctx.lineTo(0, r);
		ctx.quadraticCurveTo(0, 0, r, 0);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = '#222';
		ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
		ctx.textBaseline = 'top';
		const padX = 10;
		const padY = 8;
		const lineHeight = 15 * 1.35;
		const maxW = Math.max(0, item.w - padX * 2);
		let y = padY;
		const paragraphs = item.content.split('\n');
		for (const para of paragraphs) {
			if (para.length === 0) {
				y += lineHeight;
				continue;
			}
			const words = para.split(/(\s+)/);
			let line = '';
			for (const token of words) {
				const test = line + token;
				if (ctx.measureText(test).width > maxW && line.trim().length > 0) {
					ctx.fillText(line, padX, y);
					y += lineHeight;
					line = token.replace(/^\s+/, '');
				} else {
					line = test;
				}
			}
			if (line) {
				ctx.fillText(line, padX, y);
				y += lineHeight;
			}
		}
	}

	async function exportPng() {
		if (items.length === 0) return;
		const padding = 20;
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const item of items) {
			const cx = item.x + item.w / 2;
			const cy = item.y + item.h / 2;
			const rad = (item.rotation * Math.PI) / 180;
			const cosA = Math.abs(Math.cos(rad));
			const sinA = Math.abs(Math.sin(rad));
			const halfW = (item.w * cosA + item.h * sinA) / 2;
			const halfH = (item.w * sinA + item.h * cosA) / 2;
			minX = Math.min(minX, cx - halfW);
			minY = Math.min(minY, cy - halfH);
			maxX = Math.max(maxX, cx + halfW);
			maxY = Math.max(maxY, cy + halfH);
		}
		const width = Math.max(1, Math.ceil(maxX - minX + padding * 2));
		const height = Math.max(1, Math.ceil(maxY - minY + padding * 2));
		const offX = padding - minX;
		const offY = padding - minY;

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const images = new Map<string, HTMLImageElement | null>();
		await Promise.all(
			items
				.filter((it) => it.type === 'image')
				.map(async (it) => {
					images.set(it.id, await loadImage(it.content));
				})
		);

		for (const item of items) {
			ctx.save();
			const cx = item.x + item.w / 2 + offX;
			const cy = item.y + item.h / 2 + offY;
			ctx.translate(cx, cy);
			ctx.rotate((item.rotation * Math.PI) / 180);
			ctx.translate(-item.w / 2, -item.h / 2);
			if (item.type === 'image') {
				const img = images.get(item.id);
				if (img) {
					// object-fit: contain
					const itemRatio = item.w / item.h;
					const imgRatio = img.width / img.height;
					let dw: number;
					let dh: number;
					let dx: number;
					let dy: number;
					if (imgRatio > itemRatio) {
						dw = item.w;
						dh = item.w / imgRatio;
						dx = 0;
						dy = (item.h - dh) / 2;
					} else {
						dh = item.h;
						dw = item.h * imgRatio;
						dx = (item.w - dw) / 2;
						dy = 0;
					}
					ctx.drawImage(img, dx, dy, dw, dh);
				}
			} else {
				drawTextItem(ctx, item);
			}
			ctx.restore();
		}

		canvas.toBlob((blob) => {
			if (blob) triggerDownload(blob, 'canvas.png');
		}, 'image/png');
	}

	function uid(): string {
		return Math.random().toString(36).slice(2, 10);
	}

	function screenToCanvas(clientX: number, clientY: number): { x: number; y: number } {
		if (!viewportEl) return { x: 0, y: 0 };
		const rect = viewportEl.getBoundingClientRect();
		return {
			x: (clientX - rect.left - camera.x) / camera.scale,
			y: (clientY - rect.top - camera.y) / camera.scale
		};
	}

	function viewportCenterCanvas(): { x: number; y: number } {
		if (!viewportEl) return { x: 0, y: 0 };
		const rect = viewportEl.getBoundingClientRect();
		return screenToCanvas(rect.left + rect.width / 2, rect.top + rect.height / 2);
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		if (!viewportEl) return;
		const rect = viewportEl.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;
		const isZoom = e.ctrlKey || e.metaKey;
		if (isZoom) {
			const factor = Math.exp(-e.deltaY * 0.0015);
			const newScale = Math.max(0.1, Math.min(8, camera.scale * factor));
			// Zoom around cursor: keep world point under cursor stable.
			const wx = (mx - camera.x) / camera.scale;
			const wy = (my - camera.y) / camera.scale;
			camera = {
				x: mx - wx * newScale,
				y: my - wy * newScale,
				scale: newScale
			};
		} else {
			camera = { ...camera, x: camera.x - e.deltaX, y: camera.y - e.deltaY };
		}
	}

	function onViewportPointerDown(e: PointerEvent) {
		// Pan only on background; ignore if click landed on an item or the toolbar.
		const target = e.target as HTMLElement;
		if (target.closest('.item') || target.closest('.canvas-toolbar')) return;
		selectedId = null;
		editingId = null;
		const startX = e.clientX;
		const startY = e.clientY;
		const startCam = { ...camera };
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		function move(ev: PointerEvent) {
			camera = { ...startCam, x: startCam.x + (ev.clientX - startX), y: startCam.y + (ev.clientY - startY) };
		}
		function up() {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
		}
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	}

	function startDragItem(e: PointerEvent, id: string) {
		e.stopPropagation();
		selectedId = id;
		if (editingId !== id) editingId = null;
		const it = items.find((x) => x.id === id);
		if (!it) return;
		const startX = e.clientX;
		const startY = e.clientY;
		const sx = it.x;
		const sy = it.y;
		function move(ev: PointerEvent) {
			const dx = (ev.clientX - startX) / camera.scale;
			const dy = (ev.clientY - startY) / camera.scale;
			const item = items.find((x) => x.id === id);
			if (item) {
				item.x = sx + dx;
				item.y = sy + dy;
			}
		}
		function up() {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
		}
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	}

	function startResize(e: PointerEvent, id: string) {
		e.stopPropagation();
		selectedId = id;
		const it = items.find((x) => x.id === id);
		if (!it) return;
		const startX = e.clientX;
		const startY = e.clientY;
		const sw = it.w;
		const sh = it.h;
		function move(ev: PointerEvent) {
			const dx = (ev.clientX - startX) / camera.scale;
			const dy = (ev.clientY - startY) / camera.scale;
			const item = items.find((x) => x.id === id);
			if (item) {
				item.w = Math.max(40, sw + dx);
				item.h = Math.max(30, sh + dy);
			}
		}
		function up() {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
		}
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	}

	function startRotate(e: PointerEvent, id: string) {
		e.stopPropagation();
		selectedId = id;
		const it = items.find((x) => x.id === id);
		if (!it || !viewportEl) return;
		// Centre of the item in screen coords:
		const rect = viewportEl.getBoundingClientRect();
		const cxCanvas = it.x + it.w / 2;
		const cyCanvas = it.y + it.h / 2;
		const cxScreen = rect.left + camera.x + cxCanvas * camera.scale;
		const cyScreen = rect.top + camera.y + cyCanvas * camera.scale;
		const startAngle = Math.atan2(e.clientY - cyScreen, e.clientX - cxScreen);
		const startRot = it.rotation;
		function move(ev: PointerEvent) {
			const a = Math.atan2(ev.clientY - cyScreen, ev.clientX - cxScreen);
			const delta = ((a - startAngle) * 180) / Math.PI;
			const item = items.find((x) => x.id === id);
			if (item) item.rotation = startRot + delta;
		}
		function up() {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
		}
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	}

	function onPaste(e: ClipboardEvent) {
		// Window-level listener: ignore if the user is pasting into a text field
		// (including a text item's textarea on the canvas itself).
		const target = e.target as HTMLElement | null;
		if (
			target &&
			(target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable)
		) {
			return;
		}
		const cd = e.clipboardData;
		if (!cd) return;
		const center = viewportCenterCanvas();
		let placed = false;
		for (const item of Array.from(cd.items)) {
			if (item.kind === 'file' && item.type.startsWith('image/')) {
				const file = item.getAsFile();
				if (!file) continue;
				const reader = new FileReader();
				reader.onload = () => {
					const dataUrl = reader.result as string;
					const img = new Image();
					img.onload = () => {
						const max = 480;
						const ratio = Math.min(1, max / Math.max(img.width, img.height));
						items = [
							...items,
							{
								id: uid(),
								type: 'image',
								x: center.x - (img.width * ratio) / 2,
								y: center.y - (img.height * ratio) / 2,
								w: img.width * ratio,
								h: img.height * ratio,
								rotation: 0,
								content: dataUrl
							}
						];
					};
					img.src = dataUrl;
				};
				reader.readAsDataURL(file);
				placed = true;
				break;
			}
		}
		if (!placed) {
			const text = cd.getData('text/plain');
			if (text) {
				items = [
					...items,
					{
						id: uid(),
						type: 'text',
						x: center.x - 120,
						y: center.y - 40,
						w: 240,
						h: 80,
						rotation: 0,
						content: text
					}
				];
				e.preventDefault();
			}
		}
	}

	function onKeyDown(e: KeyboardEvent) {
		if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
			const target = e.target as HTMLElement;
			// Don't delete items if the user is typing inside a text box.
			if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable) return;
			items = items.filter((x) => x.id !== selectedId);
			selectedId = null;
			e.preventDefault();
		}
	}

	function updateText(id: string, value: string) {
		const item = items.find((x) => x.id === id);
		if (item) item.content = value;
	}
</script>

<svelte:window onkeydown={onKeyDown} onpaste={onPaste} />

<div
	class="viewport"
	bind:this={viewportEl}
	onwheel={onWheel}
	onpointerdown={onViewportPointerDown}
	role="application"
	aria-label="Canvas: paste images or text, drag to move, scroll to pan, ctrl+scroll to zoom"
>
	<div class="world" style="transform: translate({camera.x}px, {camera.y}px) scale({camera.scale});">
		{#each items as item (item.id)}
			<div
				class="item"
				class:selected={selectedId === item.id}
				class:editing={editingId === item.id}
				style="left: {item.x}px; top: {item.y}px; width: {item.w}px; height: {item.h}px; transform: rotate({item.rotation}deg);"
				onpointerdown={(e) => startDragItem(e, item.id)}
				ondblclick={(e) => {
					if (item.type === 'text') {
						e.stopPropagation();
						editingId = item.id;
					}
				}}
				role="button"
				tabindex="-1"
			>
				{#if item.type === 'image'}
					<img src={item.content} alt="" draggable="false" />
				{:else if editingId === item.id}
					<textarea
						class="text-item"
						value={item.content}
						oninput={(e) => updateText(item.id, (e.currentTarget as HTMLTextAreaElement).value)}
						onpointerdown={(e) => e.stopPropagation()}
						ondblclick={(e) => e.stopPropagation()}
						onblur={() => {
							if (editingId === item.id) editingId = null;
						}}
						spellcheck="false"
						{@attach (el) => {
							(el as HTMLTextAreaElement).focus();
							(el as HTMLTextAreaElement).select();
						}}
					></textarea>
				{:else}
					<div class="text-display">{item.content}</div>
				{/if}
				{#if selectedId === item.id}
					<div
						class="handle rotate"
						onpointerdown={(e) => startRotate(e, item.id)}
						role="button"
						aria-label="Rotate"
						tabindex="-1"
					></div>
					<div
						class="handle resize"
						onpointerdown={(e) => startResize(e, item.id)}
						role="button"
						aria-label="Resize"
						tabindex="-1"
					></div>
				{/if}
			</div>
		{/each}
	</div>
	{#if items.length === 0}
		<div class="hint">
			<strong>Paste an image</strong> or <strong>text</strong> to add it to the canvas.<br />
			Drag to move, scroll to pan, <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+scroll to zoom. Press <kbd>Del</kbd> to remove.
		</div>
	{/if}
	<div class="canvas-toolbar">
		<button type="button" class="btn" onclick={loadFile}>Load</button>
		<button type="button" class="btn" onclick={saveJson}>Save</button>
		<button type="button" class="btn" onclick={exportPng} disabled={items.length === 0}>
			Export PNG
		</button>
		{#if isDirty}<span class="dirty" title="Unsaved changes">•</span>{/if}
	</div>
	<input
		bind:this={fileInputEl}
		type="file"
		accept=".json,application/json"
		onchange={onFileChosen}
		hidden
	/>
	<div class="zoom-indicator">{(camera.scale * 100).toFixed(0)}%</div>
</div>

<style>
	.viewport {
		position: relative;
		flex: 1 1 auto;
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow: hidden;
		background:
			radial-gradient(circle at 20% 30%, rgba(102, 126, 234, 0.12), transparent 50%),
			radial-gradient(circle at 80% 70%, rgba(118, 75, 162, 0.12), transparent 50%),
			rgba(20, 24, 32, 0.9);
		cursor: grab;
		outline: none;
		user-select: none;
		touch-action: none;
	}
	.viewport:active {
		cursor: grabbing;
	}
	.world {
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: 0 0;
		will-change: transform;
	}
	.item {
		position: absolute;
		transform-origin: 50% 50%;
		border: 2px solid transparent;
		border-radius: 4px;
		box-shadow: 0 2px 8px #0006;
		background: #fff;
		cursor: move;
	}
	.item.selected {
		border-color: #6ea0ff;
		box-shadow:
			0 0 0 1px #6ea0ff,
			0 4px 14px #0008;
	}
	.item img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		pointer-events: none;
		display: block;
	}
	.text-item,
	.text-display {
		width: 100%;
		height: 100%;
		padding: 8px 10px;
		background: rgba(255, 255, 255, 0.96);
		color: #222;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		font-size: 15px;
		line-height: 1.35;
		border-radius: 4px;
		box-sizing: border-box;
		white-space: pre-wrap;
		overflow: hidden;
		word-break: break-word;
	}
	.text-item {
		border: none;
		resize: none;
		outline: none;
	}
	.text-display {
		pointer-events: none;
		user-select: none;
	}
	.item.editing {
		cursor: text;
	}
	.handle {
		position: absolute;
		background: #6ea0ff;
		border: 2px solid #fff;
		border-radius: 50%;
	}
	.handle.resize {
		right: -8px;
		bottom: -8px;
		width: 14px;
		height: 14px;
		cursor: nwse-resize;
		border-radius: 3px;
	}
	.handle.rotate {
		left: 50%;
		top: -28px;
		width: 14px;
		height: 14px;
		margin-left: -7px;
		cursor: grab;
	}
	.hint {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: #cfd6e2;
		font-size: 0.95em;
		text-align: center;
		pointer-events: none;
		line-height: 1.6;
	}
	.hint kbd {
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid #fff3;
		border-radius: 4px;
		padding: 1px 6px;
		font-family: inherit;
		font-size: 0.9em;
	}
	.zoom-indicator {
		position: absolute;
		bottom: 8px;
		right: 12px;
		font-size: 0.8em;
		color: #9aa3b2;
		background: rgba(0, 0, 0, 0.4);
		padding: 2px 8px;
		border-radius: 4px;
		pointer-events: none;
	}
	.canvas-toolbar {
		position: absolute;
		top: 8px;
		left: 12px;
		display: flex;
		align-items: center;
		gap: 6px;
		background: rgba(0, 0, 0, 0.45);
		padding: 4px 6px;
		border-radius: 6px;
		border: 1px solid #fff2;
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
	.dirty {
		font-size: 1.2em;
		color: #ffb347;
		padding: 0 4px;
	}
</style>
