<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	const now = writable(new Date());
	let interval: any;

	onMount(() => {
		interval = setInterval(() => now.set(new Date()), 10000);
		return () => clearInterval(interval);
	});
</script>

<div class="clock">
	{$now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
</div>

<style>
	.clock {
		display: block;
		text-align: center;
		line-height: 1;
		padding-top: 100px;
		margin: 0;
		color: #fff;
		letter-spacing: -5px;
		font-size: 180px;
		font-weight: 500;
		opacity: 0.9;

		font-family:
			'HelveticaNeue-Medium', 'Helvetica Neue Medium', 'Helvetica Neue', Helvetica, Arial,
			sans-serif;
		text-shadow: 1px 1px 1px #000;
		margin: 0;
	}
</style>
