# PostgreSQL setup

1. Copy `.env.example` to `.env` in the project folder.
2. Set `PGPASSWORD` to the password configured for your local PostgreSQL user. The default user is `postgres`.
3. Start the PostgreSQL 18 Windows service.
4. Run `npm run dev` from the project folder.

The local API creates the `shender_club` database (if the configured PostgreSQL user is allowed to create databases), then creates `crm_records`. The CRM keeps its IndexedDB copy for offline use and backs up all IndexedDB collections plus lounge table settings to PostgreSQL every 10 seconds.

To inspect saved data in pgAdmin or psql:

```sql
SELECT collection, record_id, location_id, payload, updated_at
FROM crm_records
ORDER BY collection, location_id, record_id;
```

Collections are sessions, players, inventory, expenses, cues, users, locations, and table configurations. Records are stored as JSONB payloads so the existing app fields are retained.
