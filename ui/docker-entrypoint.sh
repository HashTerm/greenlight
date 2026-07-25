#!/bin/sh
set -e
if [ -n "$DATABASE_URL" ] && [ -f "drizzle/migrations/0000_admin_users.sql" ]; then
  node --input-type=module -e "
    import fs from 'fs';
    const { default: postgres } = await import('postgres');
    const sql = fs.readFileSync('drizzle/migrations/0000_admin_users.sql', 'utf8');
    const client = postgres(process.env.DATABASE_URL, { max: 1 });
    await client.unsafe(sql);
    await client.end();
    console.log('Admin users migration applied');
  " || echo "Warning: admin_users migration skipped"
fi
exec "$@"
