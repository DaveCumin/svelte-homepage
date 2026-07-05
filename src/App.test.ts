import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import App from './App.svelte';

describe('App', () => {
	it('renders the main layout', () => {
		render(App);
		expect(screen.getByText(/svelte/i)).toBeInTheDocument();
	});
});
