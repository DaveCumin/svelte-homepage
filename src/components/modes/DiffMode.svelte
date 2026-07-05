<script lang="ts">
	import { diffChars, type Change } from 'diff';

	const KEY_A = 'editor.diff.a';
	const KEY_B = 'editor.diff.b';
	const DEFAULT_A = `The quick brown fox
jumps over the lazy dog
and runs away.
Line four.
Final line.`;
	const DEFAULT_B = `The quick brown fox
leaps over the lazy dog
and runs away.
Line four point five.
Final line.`;

	type Seg = { text: string; kind: 'same' | 'removed' | 'added' };

	let textA = $state<string>(loadOr(KEY_A, DEFAULT_A));
	let textB = $state<string>(loadOr(KEY_B, DEFAULT_B));
	let split = $state<number>(50);

	// Debounced snapshots used to compute the diff. Initialised from storage rather than from
	// the live state to avoid the state_referenced_locally warning; the effect below keeps them in sync.
	let debouncedA = $state<string>(loadOr(KEY_A, DEFAULT_A));
	let debouncedB = $state<string>(loadOr(KEY_B, DEFAULT_B));

	const segsLeft = $derived<Seg[]>(computeLeft(debouncedA, debouncedB));
	const segsRight = $derived<Seg[]>(computeRight(debouncedA, debouncedB));

	const statsA = $derived(countStats(textA));
	const statsB = $derived(countStats(textB));

	function countStats(s: string): { chars: number; words: number } {
		const words = s.trim() === '' ? 0 : s.trim().split(/\s+/).length;
		return { chars: s.length, words };
	}

	let taLeft: HTMLTextAreaElement | undefined = $state();
	let taRight: HTMLTextAreaElement | undefined = $state();
	let preLeft: HTMLPreElement | undefined = $state();
	let preRight: HTMLPreElement | undefined = $state();

	function loadOr(key: string, fallback: string): string {
		if (typeof localStorage === 'undefined') return fallback;
		return localStorage.getItem(key) ?? fallback;
	}

	$effect(() => {
		// Read synchronously so Svelte tracks these as dependencies;
		// the setTimeout callback alone wouldn't register them.
		const a = textA;
		const b = textB;
		const t = setTimeout(() => {
			debouncedA = a;
			debouncedB = b;
		}, 300);
		return () => clearTimeout(t);
	});

	$effect(() => {
		try {
			localStorage.setItem(KEY_A, textA);
			localStorage.setItem(KEY_B, textB);
		} catch {
			// ignore
		}
	});

	// Character-level diff. The `diff` library guarantees that concatenating every
	// non-added segment reconstructs `a` exactly (and every non-removed segment
	// reconstructs `b`), so the highlight overlay stays perfectly aligned with the
	// textarea while colouring only the characters that actually changed.
	function computeLeft(a: string, b: string): Seg[] {
		const parts: Change[] = diffChars(a, b);
		const out: Seg[] = [];
		for (const p of parts) {
			if (p.added) continue;
			out.push({ text: p.value, kind: p.removed ? 'removed' : 'same' });
		}
		return out;
	}

	function computeRight(a: string, b: string): Seg[] {
		const parts: Change[] = diffChars(a, b);
		const out: Seg[] = [];
		for (const p of parts) {
			if (p.removed) continue;
			out.push({ text: p.value, kind: p.added ? 'added' : 'same' });
		}
		return out;
	}

	function syncLeft() {
		if (taLeft && preLeft) {
			preLeft.scrollTop = taLeft.scrollTop;
			preLeft.scrollLeft = taLeft.scrollLeft;
		}
	}
	function syncRight() {
		if (taRight && preRight) {
			preRight.scrollTop = taRight.scrollTop;
			preRight.scrollLeft = taRight.scrollLeft;
		}
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
	<div class="panel" style="width: {split}%;">
		<div class="status">
			<span>Original</span>
			<span class="counts">{statsA.words} words · {statsA.chars} chars</span>
		</div>
		<div class="stack">
			<pre bind:this={preLeft} class="highlights" aria-hidden="true">{#each segsLeft as seg, i (i)}<span class="seg {seg.kind}">{seg.text}</span>{/each}</pre>
			<textarea
				bind:this={taLeft}
				bind:value={textA}
				onscroll={syncLeft}
				spellcheck="false"
				placeholder="Original text…"
			></textarea>
		</div>
	</div>
	<div class="resize-handle" onmousedown={handleResize} role="separator" aria-orientation="vertical"></div>
	<div class="panel" style="width: {100 - split}%;">
		<div class="status">
			<span>Modified</span>
			<span class="counts">{statsB.words} words · {statsB.chars} chars</span>
		</div>
		<div class="stack">
			<pre bind:this={preRight} class="highlights" aria-hidden="true">{#each segsRight as seg, i (i)}<span class="seg {seg.kind}">{seg.text}</span>{/each}</pre>
			<textarea
				bind:this={taRight}
				bind:value={textB}
				onscroll={syncRight}
				spellcheck="false"
				placeholder="Modified text…"
			></textarea>
		</div>
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
		background: rgba(24, 28, 34, 0.92);
	}
	.status {
		flex: 0 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 8px;
		padding: 4px 12px;
		font-size: 0.8em;
		color: #9aa3b2;
		background: rgba(0, 0, 0, 0.25);
		border-bottom: 1px solid #fff1;
	}
	.status .counts {
		color: #6f7787;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.stack {
		position: relative;
		flex: 1 1 auto;
		min-height: 0;
	}
	.highlights,
	.stack textarea {
		position: absolute;
		inset: 0;
		margin: 0;
		padding: 12px;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 15px;
		line-height: 1.5;
		white-space: pre-wrap;
		overflow-wrap: break-word;
		word-break: break-word;
		overflow-x: hidden;
		overflow-y: auto;
		border: none;
		box-sizing: border-box;
		tab-size: 4;
	}
	.highlights {
		color: transparent;
		background: transparent;
		pointer-events: none;
		z-index: 1;
	}
	.highlights .seg {
		padding: 0;
	}
	.highlights .seg.removed {
		background: rgba(255, 80, 80, 0.32);
		border-radius: 2px;
	}
	.highlights .seg.added {
		background: rgba(80, 220, 120, 0.32);
		border-radius: 2px;
	}
	.stack textarea {
		z-index: 2;
		background: transparent;
		color: #e8ebf2;
		caret-color: #fff;
		resize: none;
		outline: none;
	}
	.resize-handle {
		flex: 0 0 auto;
		width: 8px;
		cursor: ew-resize;
		background: linear-gradient(90deg, #4448, #fff4, #4448);
		z-index: 2;
	}
</style>
