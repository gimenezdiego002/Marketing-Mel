import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    resolve: {
        dedupe: ['react', 'react-dom', '@tanstack/react-query', 'react-router-dom'],
    },
    optimizeDeps: {
        include: ['@tanstack/react-query', 'react-router-dom'],
    },
    server: {
        watch: {
            ignored: ['**/walkthrough/chrome-profile/**'],
        },
    },
});
