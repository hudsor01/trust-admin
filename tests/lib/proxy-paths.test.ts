import { describe, expect, test } from 'bun:test'

/** Verify proxy publicPaths does NOT include /api/inventory and retains all other expected paths. */

const proxySource = await Bun.file('src/proxy.ts').text()

// Extract publicPaths array content from source
const arrayMatch = proxySource.match(/const publicPaths\s*=\s*\[([\s\S]*?)\]/)
const pathsBlock = arrayMatch?.[1] ?? ''

describe('proxy publicPaths', () => {
    test('/api/inventory is NOT in publicPaths', () => {
        // Check for the exact path entry (not just substring)
        expect(pathsBlock).not.toMatch(/['"]\/api\/inventory['"]/)
    })

    const expectedPaths = [
        '/',
        '/auth',
        '/api/auth',
        '/api/trpc',
        '/api/e2e',
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
