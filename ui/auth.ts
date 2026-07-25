import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { authConfig } from '@/auth.config'
import { db } from '@/lib/db'
import { adminUsers } from '@/drizzle/schema'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const [user] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.email, email.toLowerCase()))
          .limit(1)

        if (!user) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return { id: String(user.id), email: user.email }
      },
    }),
  ],
})
