/**
 * Authentication Test Utilities
 * 
 * Helper functions for creating test users, sessions, and authentication headers
 */
import { db } from "../../db"
import { user, session, beneficiary } from "../../db/schema"
import { generateId } from "../../db/helpers"
import { eq } from "drizzle-orm"

const BASE_URL = "http://localhost:5050"

/**
 * Create a test user in the database
 */
export async function createTestUser(options: {
  email: string
  name: string
  role: "admin" | "beneficiary"
  beneficiaryId?: string
}) {
  const userId = generateId()

  await db.insert(user).values({
    id: userId,
    email: options.email,
    name: options.name,
    role: options.role,
    beneficiaryId: options.beneficiaryId || null,
    emailVerified: true,
    // createdAt and updatedAt have defaults
  })

  return userId
}

/**
 * Create a test session for a user
 */
export async function createTestSession(userId: string) {
  const sessionId = generateId()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

  await db.insert(session).values({
    id: sessionId,
    userId,
    token: `test_session_${sessionId}`,
    expiresAt,
    // createdAt and updatedAt have defaults
  })

  return sessionId
}

/**
 * Create a test beneficiary in the database
 */
export async function createTestBeneficiary(options: {
  entityId: string
  firstName: string
  lastName: string
  email: string
}) {
  const beneficiaryId = generateId()
  const now = new Date().toISOString()

  await db.insert(beneficiary).values({
    id: beneficiaryId,
    entityId: options.entityId,
    firstName: options.firstName,
    lastName: options.lastName,
    email: options.email,
    relationship: "CHILD",
    sharePercent: "0.25",
    updatedAt: now,
    // createdAt has default
  })

  return beneficiaryId
}

/**
 * Get authentication headers for a session
 */
export function getAuthHeaders(sessionToken: string) {
  return {
    "Cookie": `better-auth.session_token=${sessionToken}`,
  }
}

/**
 * Clean up test users and sessions
 */
export async function cleanupTestAuth(userIds: string[]) {
  if (userIds.length === 0) return
  
  // Delete sessions first (FK constraint)
  await db.delete(session).where(
    eq(session.userId, userIds[0])
  )
  
  // Delete users
  for (const userId of userIds) {
    await db.delete(user).where(eq(user.id, userId))
  }
}

/**
 * Clean up test beneficiaries
 */
export async function cleanupTestBeneficiaries(beneficiaryIds: string[]) {
  if (beneficiaryIds.length === 0) return
  
  for (const beneficiaryId of beneficiaryIds) {
    await db.delete(beneficiary).where(eq(beneficiary.id, beneficiaryId))
  }
}

/**
 * Check if server is available
 */
export async function isServerAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, {
      signal: AbortSignal.timeout(2000)
    })
    return res.ok
  } catch {
    return false
  }
}
