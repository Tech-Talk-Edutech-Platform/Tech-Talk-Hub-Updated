import express, { type Request, type Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import { requireServerEnv } from '../env'
import { rateLimit } from '../middleware/rateLimit'
import { supabase } from '../supabase'

/**
 * POST /api/auth/username-login { username, password }: signs in with a
 * username instead of an email address (brief item 1.5).
 *
 * The server finds the account's email with the service role and signs in
 * with it, then returns only the session tokens. The browser never learns the
 * email, and a wrong username or wrong password get the same answer.
 *
 * Every username sign-in reaches Supabase from this server's address, so
 * Supabase › Authentication › Rate Limits › sign-ins may need raising if many
 * people sign in at once.
 */
const router = express.Router()

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._]{2,23}$/
const WRONG = 'Wrong username or password.'

type LoginBody = { username?: unknown; password?: unknown }

/**
 * A client that keeps nothing between requests. Signing in on the shared
 * service-role client would make it act as that person afterwards.
 */
function throwawayClient() {
  return createClient(
    requireServerEnv('SUPABASE_URL'),
    process.env.SUPABASE_ANON_KEY ||
      requireServerEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )
}

async function signIn(
  req: Request<Record<string, string>, unknown, LoginBody>,
  res: Response,
): Promise<void> {
  const username =
    typeof req.body?.username === 'string'
      ? req.body.username.trim().toLowerCase()
      : ''
  const password =
    typeof req.body?.password === 'string' ? req.body.password : ''
  if (!username || !password) {
    res.status(400).json({ error: 'Enter your username and password.' })
    return
  }
  if (!USERNAME_PATTERN.test(username) || password.length > 200) {
    res.status(401).json({ error: WRONG })
    return
  }

  const { data: account, error: lookupError } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle()
  if (lookupError) {
    console.error('Username sign-in: lookup failed:', lookupError.message)
    res.status(500).json({ error: 'Couldn’t sign you in. Try again.' })
    return
  }
  if (!account) {
    res.status(401).json({ error: WRONG })
    return
  }

  // The login email, not users.email, which can fall out of step.
  const { data: authUser, error: userError } =
    await supabase.auth.admin.getUserById(account.id)
  const email = authUser.user?.email
  if (userError || !email) {
    res.status(401).json({ error: WRONG })
    return
  }

  const { data, error } = await throwawayClient().auth.signInWithPassword({
    email,
    password,
  })
  if (error || !data.session) {
    if (error && error.status === 429) {
      res.status(429).json({
        error: 'Too many sign-in attempts. Wait a few minutes and try again.',
      })
      return
    }
    res.status(401).json({ error: WRONG })
    return
  }

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
}

router.post(
  '/',
  rateLimit({ limit: 10, windowMs: 15 * 60_000 }),
  (req: Request<Record<string, string>, unknown, LoginBody>, res: Response) => {
    signIn(req, res).catch((error: unknown) => {
      console.error('Username sign-in failed:', error)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Couldn’t sign you in. Try again.' })
      }
    })
  },
)

export default router
