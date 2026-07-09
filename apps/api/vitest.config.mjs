import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    testTimeout: 30000,
    reporters: ['agent'],
    include: ['test/**/*.test.js'],
    globalSetup: './test/global-test.mjs',
    setupFiles: ['./test/setup-env.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'index.js',
        'config/**/*.js',
        'db/models/**/*.js',
        'src/**/*.js'
      ],
      exclude: [
        'coverage/**',
        'db/migrations/**',
        'db/seeders/**',
        'test/**'
      ]
    }
  }
})