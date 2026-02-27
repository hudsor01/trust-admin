/** Configures happy-dom for React component testing with Bun. */

import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

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

class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}
window.ResizeObserver = ResizeObserverMock

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
