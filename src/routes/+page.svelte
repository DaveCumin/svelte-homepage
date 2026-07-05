<script lang="ts">
	import Background from '../components/Background.svelte';
	import Clock from '../components/Clock.svelte';
	import EditorPreview from '../components/EditorPreview.svelte';
	import { onMount } from 'svelte';
	let showEditor = false;
	function handleDblClick() {
		showEditor = !showEditor;
	}
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Personal homepage with Svelte components" />
</svelte:head>

<Background />
<div id="homepage-root" on:dblclick={handleDblClick}>
	<div id="ClockCenter"><Clock /></div>
	{#if showEditor}
		<div id="EditorOverlay" on:dblclick|stopPropagation>
			<EditorPreview />
		</div>
	{/if}
</div>

<style>
	#homepage-root {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100vw;
		height: 100vh;
		min-height: 100vh;
		z-index: 1;
		overflow: hidden;
		cursor: pointer;
	}
	#ClockCenter {
		position: absolute;
		top: 16vh;
		left: 0;
		width: 100vw;
		display: flex;
		justify-content: center;
		z-index: 10;
		pointer-events: none;
	}
	#ClockCenter .clock {
		font-size: 6vw;
		color: #fff;
		font-weight: 700;
		text-shadow:
			2px 4px 16px #000a,
			0 2px 0 #fff8;
		letter-spacing: 0.04em;
		background: none;
		margin: 0;
		padding: 0;
	}
	#EditorOverlay {
		position: absolute;
		top: 2vh;
		left: 2vw;
		width: 96vw;
		height: 94vh;
		background: rgba(255, 255, 255, 0.82);
		border: 2px solid #bbb;
		border-radius: 12px;
		box-shadow: 0 8px 32px #0005;
		z-index: 20;
		display: flex;
		flex-direction: column;
		pointer-events: auto;
		cursor: default;
		overflow: hidden;
	}
</style>
