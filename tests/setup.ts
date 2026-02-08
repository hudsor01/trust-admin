/**
 * Test Setup
 *
 * Configures happy-dom for React component testing with Bun
 */

import { GlobalRegistrator } from '@happy-dom/global-registrator'

// Register happy-dom globals before tests run
GlobalRegistrator.register()

// Set BETTER_AUTH_URL so better-auth client initialization doesn't fail.
// happy-dom sets window.location.origin to null (about:blank has no origin),
// and better-auth falls back to window.location.origin when no URL is configured.
if (!process.env.BETTER_AUTH_URL) {
    process.env.BETTER_AUTH_URL = 'http://localhost:3000'
}

// Mock matchMedia for components that use it
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
    }),
})

// Mock ResizeObserver
class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}
window.ResizeObserver = ResizeObserverMock

// Mock IntersectionObserver
class IntersectionObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
    root = null
    rootMargin = ''
    thresholds: number[] = []
    takeRecords(): IntersectionObserverEntry[] {
        return []
    }
}
window.IntersectionObserver = IntersectionObserverMock
