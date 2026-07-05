<script lang="ts">
	import Background from './components/Background.svelte';
	import Clock from './components/Clock.svelte';
	import EditorPreview from './components/EditorPreview.svelte';
	import Quote from './components/Quote.svelte';
</script>

<Background />
<div class="main-content">
	<div class="header">My Svelte Homepage</div>
	<Clock />
	<EditorPreview />
	<Quote />
</div>

<style>
	.main-content {
		position: relative;
		z-index: 1;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		padding: 2em 1em 0 1em;
	}
	.header {
		color: #fff;
		font-size: 2.2em;
		font-weight: 700;
		margin-top: 1.5em;
		text-shadow: 0 2px 8px #000a;
		letter-spacing: 0.04em;
	}
</style>
