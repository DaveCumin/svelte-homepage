<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<div>
	{@render children()}
</div>

<style>
	/* All layout and centering removed to allow overlays to control layout */
</style>
