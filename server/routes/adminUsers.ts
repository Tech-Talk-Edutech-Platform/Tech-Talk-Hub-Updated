import { randomInt } from 'node:crypto'
import express, { type Request, type Response } from 'express'
import { dashboardActor, dashboardAdmins } from '../services/dashboardActor'
import { rateLimit } from '../middleware/rateLimit'
import { supabase } from '../supabase'

/**
 * POST /api/admin/users: an admin adds a team member or student.
 *
 * The account is created with the service role, so the admin's own session in
 * the browser is untouched (signing up from the browser would switch to the
 * new account). The role goes in app_metadata, which only the server can set;
 * handle_new_user() copies it into public.users. The new person signs in with
 * the one-time temporary password returned here, then changes it.
 */
const router = express.Router()

const ASSIGNABLE_ROLES = [
  'student',
  'tutor',
  'marketer',
  'operations_admin',
  'tech_admin',
  'owner',
] as const

type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._]{2,23}$/

type CreateUserBody = {
  email?: unknown
  fullName?: unknown
  username?: unknown
  role?: unknown
  meetLink?: unknown
  subscriptionTier?: unknown
  totalClasses?: unknown
  classesRemaining?: unknown
}

type CreateUserRequest = Request<
  Record<string, string>,
  unknown,
  CreateUserBody
>

function isAssignableRole(value: unknown): value is AssignableRole {
  return ASSIGNABLE_ROLES.some((role) => role === value)
}

function text(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed && trimmed.length <= maxLength ? trimmed : null
}

/** A whole number of classes, 0–1000; null when missing or invalid. */
function classCount(value: unknown) {
  const count = typeof value === 'string' ? Number(value) : value
  return typeof count === 'number' &&
    Number.isInteger(count) &&
    count >= 0 &&
    count <= 1000
    ? count
    : null
}

function httpsUrl(value: unknown) {
  const candidate = text(value, 500)
  if (!candidate) return null
  try {
    const url = new URL(candidate)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

/** e.g. "Hk7q-Xm2P-wd9R-42": easy to read out, hard to guess. */
function temporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const group = () =>
    Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join(
      '',
    )
  return `${group()}-${group()}-${group()}-${randomInt(10, 100)}`
}

async function createUser(req: CreateUserRequest, res: Response) {
  const admin = await dashboardActor(req)
  if (!admin) {
    res.status(401).json({ error: 'Sign in again, then try once more.' })
    return
  }
  if (!dashboardAdmins.has(admin.role)) {
    res.status(403).json({ error: 'Only admins can add people.' })
    return
  }

  const body = req.body ?? {}
  const email = text(body.email, 254)?.toLowerCase() ?? null
  const fullName = text(body.fullName, 120)
  const { role } = body

  if (!email || !EMAIL_PATTERN.test(email)) {
    res.status(400).json({ error: 'Enter a valid email address.' })
    return
  }
  if (!fullName) {
    res.status(400).json({ error: 'Enter their full name.' })
    return
  }
  if (!isAssignableRole(role)) {
    res.status(400).json({ error: 'Choose a role.' })
    return
  }
  const username =
    typeof body.username === 'string' && body.username.trim()
      ? body.username.trim().toLowerCase()
      : null
  if (username && !USERNAME_PATTERN.test(username)) {
    res.status(400).json({
      error:
        'Usernames are 3 to 24 lowercase letters, numbers, dots or underscores.',
    })
    return
  }
  if (username) {
    const { data: holder } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle()
    if (holder) {
      res.status(409).json({ error: 'That username is taken. Try another.' })
      return
    }
  }
  if (role === 'owner' && admin.role !== 'owner') {
    res.status(403).json({ error: 'Only an owner can add another owner.' })
    return
  }

  const isStudent = role === 'student'
  const meetLink = role === 'tutor' ? httpsUrl(body.meetLink) : null
  if (role === 'tutor' && text(body.meetLink, 500) && !meetLink) {
    res
      .status(400)
      .json({ error: 'The meet link must be a full https:// address.' })
    return
  }

  const password = temporaryPassword()
  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { full_name: fullName, role },
    })

  if (createError || !created.user) {
    const taken =
      createError?.code === 'email_exists' ||
      /already (been )?registered|already exists/i.test(
        createError?.message ?? '',
      )
    res.status(taken ? 409 : 500).json({
      error: taken
        ? 'Someone already has an account with this email.'
        : `Couldn’t create the account: ${createError?.message ?? 'unknown error'}`,
    })
    return
  }

  const userId = created.user.id
  // The users table keeps student-only fields empty for everyone else.
  const { error: profileError } = await supabase
    .from('users')
    .update({
      full_name: fullName,
      email,
      ...(username ? { username } : {}),
      role,
      personal_meet_link: meetLink,
      subscription_tier: isStudent
        ? (text(body.subscriptionTier, 60) ?? 'Starter')
        : null,
      total_classes: isStudent ? classCount(body.totalClasses) : null,
      classes_remaining: isStudent ? classCount(body.classesRemaining) : null,
      classes_per_week: null,
    })
    .eq('id', userId)

  if (profileError) {
    // Don't leave a half-made account behind.
    await supabase.auth.admin.deleteUser(userId)
    res.status(500).json({
      error: `Couldn’t save their profile: ${profileError.message}`,
    })
    return
  }

  res.status(201).json({
    id: userId,
    email,
    role,
    temporaryPassword: password,
  })
}

router.post(
  '/',
  rateLimit({ limit: 30, windowMs: 60_000 }),
  (req: CreateUserRequest, res: Response) => {
    createUser(req, res).catch((error: unknown) => {
      console.error('Creating a user failed:', error)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Couldn’t create the account.' })
      }
    })
  },
)

export default router
