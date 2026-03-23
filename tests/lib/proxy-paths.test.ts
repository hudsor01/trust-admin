import { describe, expect, test } from 'bun:test'

/** Verify proxy publicPaths includes expected paths. */

const proxySource = await Bun.file('src/proxy.ts').text()

// Extract publicPaths array content from source
const arrayMatch = proxySource.match(/const publicPaths\s*=\s*\[([\s\S]*?)\]/)
const pathsBlock = arrayMatch?.[1] ?? ''

describe('proxy publicPaths', () => {
    const expectedPaths = [
        '/',
        '/auth',
        '/api/auth',
        '/api/trpc',
        '/api/e2e',
        '/api/inventory',
        '/forms',
        '/_next',
        '/favicon.ico',
    ]

    for (const path of expectedPaths) {
        test(`${path} IS in publicPaths`, () => {
            expect(pathsBlock).toContain(`'${path}'`)
        })
    }
})
