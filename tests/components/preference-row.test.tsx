/**
 * Unit tests for the PreferenceRow composition used by the Settings refresh.
 */
import '../setup'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PreferenceRow } from '../../src/components/preference-row'
import { Switch } from '../../src/components/ui/switch'

afterEach(() => {
    cleanup()
})

describe('PreferenceRow', () => {
    test('renders title in heading typography (text-xl font-semibold)', () => {
        render(
            <PreferenceRow title="Trust name">
                <input aria-label="value" />
            </PreferenceRow>,
        )
        const titleEl = screen.getByText('Trust name')
        expect(titleEl.className).toContain('text-xl')
        expect(titleEl.className).toContain('font-semibold')
    })

    test('renders description when provided', () => {
        render(
            <PreferenceRow title="X" description="An explanation.">
                <input aria-label="x" />
            </PreferenceRow>,
        )
        expect(screen.getByText('An explanation.')).toBeTruthy()
    })

    test('omits description element when not provided', () => {
        const { container } = render(
            <PreferenceRow title="X">
                <input aria-label="x" />
            </PreferenceRow>,
        )
        const ps = container.querySelectorAll('p')
        expect(ps.length).toBe(0)
    })

    test('renders control slot via children', () => {
        render(
            <PreferenceRow title="Test">
                <button type="button">Click</button>
            </PreferenceRow>,
        )
        expect(screen.getByRole('button', { name: /click/i })).toBeTruthy()
    })

    test('renders Switch child and supports toggle', () => {
        let toggled = false
        render(
            <PreferenceRow title="Enable feature">
                <Switch
                    onCheckedChange={(checked) => {
                        toggled = checked
                    }}
                />
            </PreferenceRow>,
        )
        const sw = screen.getByRole('switch')
        fireEvent.click(sw)
        expect(toggled).toBe(true)
    })

    test('uses 2-column grid layout on md+', () => {
        const { container } = render(
            <PreferenceRow title="X">
                <input aria-label="x" />
            </PreferenceRow>,
        )
        const root = container.firstElementChild as HTMLElement
        expect(root.className).toContain('grid')
        expect(root.className).toContain('md:grid-cols-[1fr_auto]')
        expect(root.className).toContain('grid-cols-1')
    })
})
