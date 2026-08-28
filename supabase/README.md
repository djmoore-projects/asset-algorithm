# Database schema

`full-migration.sql` is the source of truth. Make every schema change there.

## Why

The project used to carry both numbered migrations and a consolidated file, and
they disagreed. The live database was built from the numbered set, while the
TypeScript types and the application code were written against the consolidated
one. Two columns the code writes on every send were missing from the real table,
and nobody found out because nothing had sent yet.

One authoritative file removes the class of bug entirely.

## Making a change

1. Edit `full-migration.sql`.
2. Guard the statement so the file stays re-runnable:
   - `create table if not exists`
   - `create index if not exists`
   - `alter table ... add column if not exists`
   - policies and triggers have no `if not exists`, so `drop ... if exists` first
3. Run the whole file against the database. It replays safely from any state.
4. Update `src/types/database.ts` to match.

## Applying it

Supabase SQL editor, or the Management API:

```bash
curl -X POST \
  "https://api.supabase.com/v1/projects/<project-ref>/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "User-Agent: curl/8.4.0" \
  --data-binary @<(python3 -c "import json;print(json.dumps({'query':open('supabase/full-migration.sql').read()}))")
```

The `User-Agent` header matters. Without it Cloudflare returns 403 error 1010.

## Checking for drift

Compare what the file declares against what the database actually has. Any
output other than a clean match means they have diverged again:

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
order by table_name, column_name;
```

## `_archive/`

The 18 original numbered migrations, kept for history. **Do not run them.**
They describe an older schema and re-running them will reintroduce the drift
this consolidation removed.
