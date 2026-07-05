<script lang="ts">
	import { onMount } from 'svelte';
	let imageUrl = '';
	let fallbackImages = [
		'/Users/dcum007/Documents/Personal/DesktopPictures' // Directory, will pick random in logic
	];

	async function fetchUnsplash() {
		try {
			// Unsplash random image API (no key needed for demo)
			const res = await fetch('https://source.unsplash.com/1920x1080/?wallpaper,landscape,nature');
			if (res.url) {
				imageUrl = res.url;
				return;
			}
		} catch {}
		// Fallback: use a real image in static/
		imageUrl = '/bg.jpg';
	}

	onMount(fetchUnsplash);
</script>

<div class="background" style="background-image: url('{imageUrl}')"></div>

<style>
	.background {
		position: fixed;
		inset: 0;
		z-index: -1;
		background: #222;
		background-size: cover;
		background-position: center;
		transition: background-image 0.5s;
	}
</style>
