<script lang="ts">
	import { onMount } from 'svelte';
	let quote = '';
	let author = '';

	async function fetchQuote() {
		try {
			const res = await fetch('https://api.quotable.io/random');
			if (res.ok) {
				const data = await res.json();
				quote = data.content;
				author = data.author;
			}
		} catch {}
	}

	onMount(fetchQuote);
</script>

<div class="quote">
	{quote ? `“${quote}”` : 'Loading quote...'}
	{#if author}
		<div class="author">— {author}</div>
	{/if}
</div>

<style>
	.quote {
		color: #222;
		background: rgba(255, 255, 255, 0.92);
		font-size: 1.18em;
		text-align: center;
		margin: 0 auto;
		max-width: 520px;
		border-radius: 12px;
		padding: 1.1em 1.5em 0.7em 1.5em;
		box-shadow: 0 2px 16px #0003;
		font-style: italic;
		border: 1.5px solid #bbb;
		min-height: 2.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.author {
		color: #444;
		font-size: 1em;
		margin-top: 0.5em;
		font-style: normal;
	}
</style>
