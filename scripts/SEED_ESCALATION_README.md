# Seeding Escalation Queue Data

This guide explains how to seed escalated alerts in the database for presentation purposes.

## Prerequisites

1. **Database Running**: Ensure your PostgreSQL database is running
   ```bash
   # Check if Docker containers are running
   docker ps
   
   # If not, start the database
   npm run db:local:up
   ```

2. **Healthcare Setup**: Make sure you have at least one hospital and some healthcare users
   ```bash
   # Run healthcare setup if not already done
   npm run healthcare:setup:complete
   ```

## Method 1: Using npm Script (Recommended)

Run the seed script using the npm command:

```bash
npm run healthcare:seed-escalation
```

This will:
- Find an existing hospital in your database
- Create 6 escalated alerts with different tiers (2, 3, and 4)
- Set appropriate timestamps to simulate real escalation scenarios

## Method 2: Using Direct Database Connection

If you prefer to run the TypeScript file directly:

```bash
# With tsx
APP_ENV=local DATABASE_URL=postgresql://myexpo:myexpo123@localhost:5432/myexpo_dev tsx scripts/seed-escalation-queue.ts

# With bun
APP_ENV=local DATABASE_URL=postgresql://myexpo:myexpo123@localhost:5432/myexpo_dev bun run scripts/seed-escalation-queue.ts
```

## Method 3: Using Docker PostgreSQL

If you're using Docker for PostgreSQL, you can execute SQL directly:

```bash
# Connect to the PostgreSQL container
docker exec -it myexpo-postgres-local psql -U myexpo -d myexpo_dev

# Or if using different container/credentials
docker exec -it <container_name> psql -U <username> -d <database_name>
```

Then run the SQL commands from the seed script comments.

## What Gets Created

The script creates 6 escalated alerts:

| Room | Alert Type | Urgency | Tier | Description |
|------|------------|---------|------|-------------|
| 412 | Cardiac Arrest | 5 | 3 | Patient experiencing severe chest pain |
| 308 | Code Blue | 5 | 3 | Respiratory failure |
| 205 | Medical Emergency | 4 | 2 | Severe allergic reaction |
| 523 | Security | 4 | 2 | Aggressive patient |
| 101 | Fire | 5 | 4 | Smoke detected |
| 317 | Medical Emergency | 3 | 2 | Post-operative complications |

## Verifying the Data

After seeding, you can verify the data by:

1. **Using the App**: Navigate to the Escalation Queue screen in your app
2. **Database Query**: Check directly in the database:
   ```sql
   SELECT room_number, alert_type, urgency_level, current_escalation_tier, status
   FROM alerts
   WHERE status = 'active' AND current_escalation_tier > 1
   ORDER BY current_escalation_tier DESC, created_at DESC;
   ```

## Cleaning Up

To remove the seeded alerts:

```sql
-- Remove only escalated alerts
DELETE FROM alerts 
WHERE status = 'active' 
AND current_escalation_tier > 1 
AND description LIKE '%presentation%' 
OR description IN (
  'Patient experiencing severe chest pain, vitals unstable',
  'Respiratory failure, immediate intervention required',
  'Severe allergic reaction, anaphylaxis suspected',
  'Aggressive patient, staff safety concern',
  'Smoke detected in storage area, evacuation protocol initiated',
  'Post-operative complications, bleeding observed'
);
```

## Troubleshooting

1. **No hospital found error**: Run `npm run healthcare:setup:complete` first
2. **No healthcare users found**: Ensure users are properly set up with healthcare roles
3. **Database connection error**: Check your DATABASE_URL and ensure PostgreSQL is running
4. **Permission errors**: Ensure your database user has INSERT permissions on the alerts table