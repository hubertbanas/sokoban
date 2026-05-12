import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';

export default defineConfig({
    plugins: [react()],
    base: './',
    define: {
        '__APP_VERSION__': JSON.stringify(packageJson.version),
    },
    test: {
        testTimeout: 15000,
        hookTimeout: 15000,
        setupFiles: ["./src/setupTests.ts"],
    },
});