import { timingSafeEqual } from 'node:crypto'

// --- Constant-time comparison ---

export function constantTimeCompare(input: string, secret: string): boolean {
    const inputBuf = Buffer.from(input, 'utf-8')
    const secretBuf = Buffer.from(secret, 'utf-8')
    if (inputBuf.length !== secretBuf.length) {
        // Pad to same length so timingSafeEqual doesn't throw, but always return false
        const paddedInput = Buffer.alloc(secretBuf.length)
        inputBuf.copy(
            paddedInput,
            0,
            0,
            Math.min(inputBuf.length, secretBuf.length),
        )
        timingSafeEqual(paddedInput, secretBuf)
        return false
    }
    return timingSafeEqual(inputBuf, secretBuf)
}

// --- IP-based lockout ---

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes

export const failedAttempts = new Map<
    string,
    { count: number; lockedUntil: number }
>()

export function checkLockout(ip: string): {
    locked: boolean
    remaining?: number
} {
    const record = failedAttempts.get(ip)
    if (!record) return { locked: false }
    if (record.lockedUntil && Date.now() < record.lockedUntil) {
        const remaining = Math.ceil(
            (record.lockedUntil - Date.now()) / 1000 / 60,
        )
        return { locked: true, remaining }
    }
    if (record.lockedUntil && Date.now() >= record.lockedUntil) {
        failedAttempts.delete(ip)
        return { locked: false }
    }
    return { locked: false }
}

export function recordFailure(ip: string): void {
    const record = failedAttempts.get(ip) || { count: 0, lockedUntil: 0 }
    record.count++
    if (record.count >= MAX_ATTEMPTS) {
        record.lockedUntil = Date.now() + LOCKOUT_MS
    }
    failedAttempts.set(ip, record)
}

export function resetFailures(ip: string): void {
    failedAttempts.delete(ip)
}
