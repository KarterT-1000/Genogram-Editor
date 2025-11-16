import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'GenogramEditor',
            formats: ['es', 'cjs'],
            fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`
        },
        rollupOptions: {
            external: [],
            output: {
                exports: 'named',
                globals: {}
            }
        },
        outDir: 'dist',
        emptyOutDir: true
    }
});