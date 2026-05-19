'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

const VALID_THEMES: ReadonlySet<Theme> = new Set(['dark', 'light', 'system'])

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
    theme: 'system',
    setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    storageKey = 'trust-admin-theme',
    ...props
}: ThemeProviderProps) {
    // Initialize with the default so SSR and client first-render are
    // byte-identical. The stored theme (if any) loads from localStorage
    // in the mount effect below, after hydration commits — eliminates
    // React #418 mismatches that would otherwise fire when a user has
    // a non-default theme persisted.
    const [theme, setTheme] = useState<Theme>(defaultTheme)

    // Mount-only effect: load the persisted theme (if any) AFTER
    // hydration commits. Empty deps because changing `storageKey`
    // after mount is not supported, and the wrapped setter below is
    // the canonical writer — this effect is read-only at mount.
    // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only by design
    useEffect(() => {
        if (typeof window === 'undefined') return
        const stored = window.localStorage.getItem(storageKey)
        // Validate against the enum — guards against a hand-edited
        // localStorage value, a leftover key from an old version, or a
        // cross-app collision on a shared host. Without this, an invalid
        // value would silently land as a junk class on `<html>` via
        // the effect below.
        if (stored && VALID_THEMES.has(stored as Theme)) {
            setTheme(stored as Theme)
        }
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') return
        const root = window.document.documentElement

        root.classList.remove('light', 'dark')

        if (theme === 'system') {
            const systemTheme = window.matchMedia(
                '(prefers-color-scheme: dark)',
            ).matches
                ? 'dark'
                : 'light'

            root.classList.add(systemTheme)
            return
        }

        root.classList.add(theme)
    }, [theme])

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme)
            setTheme(theme)
        },
    }

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider')

    return context
}
