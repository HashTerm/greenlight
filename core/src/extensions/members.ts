import { randomUUID } from 'node:crypto'
import { withClient } from '../db/client.js'
import type { MemberRole, MemberStatus } from './constants.js'
import { MEMBER_ROLES, MEMBER_STATUSES } from './constants.js'

export type OrgMemberRow = {
  id: string
  email: string
  role: MemberRole
  invited_by: string | null
  status: MemberStatus
  created_at: string
}

function rowToMember(row: OrgMemberRow): OrgMemberRow {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    invited_by: row.invited_by,
    status: row.status,
    created_at:
      typeof row.created_at === 'string'
        ? row.created_at
        : (row.created_at as unknown as Date).toISOString(),
  }
}

export async function countMembers(): Promise<number> {
  const result = await withClient((client) =>
    client.query<{ c: string }>('SELECT count(*)::text AS c FROM org_members'),
  )
  return Number(result.rows[0]?.c ?? 0)
}

export async function ensureBootstrapMember(email: string, memberId?: string): Promise<void> {
  const count = await countMembers()
  if (count > 0) return

  const id = memberId ?? randomUUID()
  await withClient((client) =>
    client.query(
      `INSERT INTO org_members (id, email, role, status)
       VALUES ($1, $2, 'admin', 'active')
       ON CONFLICT (email) DO NOTHING`,
      [id, email.toLowerCase()],
    ),
  )
}

export async function listMembers(): Promise<OrgMemberRow[]> {
  const result = await withClient((client) =>
    client.query<OrgMemberRow>(
      `SELECT id, email, role, invited_by, status, created_at
       FROM org_members
       ORDER BY created_at ASC`,
    ),
  )
  return result.rows.map(rowToMember)
}

export async function getMemberById(id: string): Promise<OrgMemberRow | null> {
  const result = await withClient((client) =>
    client.query<OrgMemberRow>(
      `SELECT id, email, role, invited_by, status, created_at
       FROM org_members WHERE id = $1`,
      [id],
    ),
  )
  const row = result.rows[0]
  return row ? rowToMember(row) : null
}

export async function getMemberByEmail(email: string): Promise<OrgMemberRow | null> {
  const result = await withClient((client) =>
    client.query<OrgMemberRow>(
      `SELECT id, email, role, invited_by, status, created_at
       FROM org_members WHERE email = $1`,
      [email.toLowerCase()],
    ),
  )
  const row = result.rows[0]
  return row ? rowToMember(row) : null
}

export async function inviteMember(input: {
  email: string
  role?: MemberRole
  invitedBy?: string
}): Promise<OrgMemberRow> {
  const email = input.email.toLowerCase()
  const role = input.role ?? 'member'
  if (!MEMBER_ROLES.includes(role)) {
    throw new Error(`Invalid role: ${role}`)
  }

  const existing = await getMemberByEmail(email)
  if (existing) {
    throw new Error('Member already exists')
  }

  const id = randomUUID()
  const result = await withClient((client) =>
    client.query<OrgMemberRow>(
      `INSERT INTO org_members (id, email, role, invited_by, status)
       VALUES ($1, $2, $3, $4, 'invited')
       RETURNING id, email, role, invited_by, status, created_at`,
      [id, email, role, input.invitedBy ?? null],
    ),
  )
  return rowToMember(result.rows[0])
}

export async function updateMember(
  id: string,
  patch: { role?: MemberRole; status?: MemberStatus },
): Promise<OrgMemberRow | null> {
  const sets: string[] = []
  const params: unknown[] = []

  if (patch.role !== undefined) {
    if (!MEMBER_ROLES.includes(patch.role)) {
      throw new Error(`Invalid role: ${patch.role}`)
    }
    params.push(patch.role)
    sets.push(`role = $${params.length}`)
  }
  if (patch.status !== undefined) {
    if (!MEMBER_STATUSES.includes(patch.status)) {
      throw new Error(`Invalid status: ${patch.status}`)
    }
    params.push(patch.status)
    sets.push(`status = $${params.length}`)
  }

  if (sets.length === 0) {
    return getMemberById(id)
  }

  params.push(id)
  const result = await withClient((client) =>
    client.query<OrgMemberRow>(
      `UPDATE org_members SET ${sets.join(', ')}
       WHERE id = $${params.length}
       RETURNING id, email, role, invited_by, status, created_at`,
      params,
    ),
  )
  const row = result.rows[0]
  return row ? rowToMember(row) : null
}

export async function deleteMember(id: string): Promise<boolean> {
  const result = await withClient((client) =>
    client.query('DELETE FROM org_members WHERE id = $1', [id]),
  )
  return (result.rowCount ?? 0) > 0
}

export async function activateMember(email: string): Promise<void> {
  await withClient((client) =>
    client.query(
      `UPDATE org_members SET status = 'active' WHERE email = $1 AND status = 'invited'`,
      [email.toLowerCase()],
    ),
  )
}
