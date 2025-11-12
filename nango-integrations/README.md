# Nango Integrations

This folder contains all Nango sync functions that automatically fetch data from 3rd party APIs.

## Overview

Instead of building custom scheduling and data fetching logic, we use **Nango's native Syncs** infrastructure:

- ✅ Nango runs sync functions automatically on configured schedules
- ✅ Nango stores synced data in encrypted cache
- ✅ Nango detects changes (additions, updates, deletions)
- ✅ Nango sends webhooks when data changes
- ✅ Nango handles rate limiting, retries, and pagination

## Project Structure

```
nango-integrations/
├── README.md           # This file
├── nango.yaml          # Sync definitions and schedules
├── models.ts           # TypeScript interfaces for synced data
│
├── posthog/            # PostHog syncs
│   ├── active-users.ts
│   ├── total-events.ts
│   └── conversion-rate.ts
│
├── google-sheets/      # Google Sheets syncs
│   └── sheet-rows.ts
│
└── slack/              # Slack syncs
    ├── channel-messages.ts
    └── active-users.ts
```

## Available Syncs

### PostHog (Product Analytics)

| Sync | Model | Schedule | Type | Description |
|------|-------|----------|------|-------------|
| `active-users` | PostHogPerson | Every 15 min | Incremental | Active users and properties |
| `total-events` | PostHogEvent | Every hour | Incremental | All tracked events |
| `conversion-rate` | PostHogConversionData | Every 30 min | Full | Funnel conversion metrics |

### Google Sheets

| Sync | Model | Schedule | Type | Description |
|------|-------|----------|------|-------------|
| `sheet-rows` | SheetRow | Every 5 min | Full | Spreadsheet rows (configured range) |
| `sheet-metadata` | SheetMetadata | Every hour | Full | Spreadsheet metadata |

### Slack

| Sync | Model | Schedule | Type | Description |
|------|-------|----------|------|-------------|
| `channel-messages` | SlackMessage | Every 30 min | Incremental | Messages from configured channels |
| `active-users` | SlackUser | Every hour | Full | All workspace users |
| `channels` | SlackChannel | Every 2 hours | Full | Channel list |

## Development Workflow

### 1. Run Nango Dev Server

```bash
# From project root
pnpm nango:dev

# Or from nango-integrations/ folder
cd nango-integrations
nango dev
```

This starts a local Nango server that:
- Watches for changes to sync functions
- Hot-reloads when you save files
- Allows testing syncs locally

### 2. Test a Sync Function

```bash
# Dry run a sync (doesn't actually save data)
nango dry-run --sync active-users --connection-id test-conn-123

# View sync logs
nango logs --sync active-users
```

### 3. Deploy Syncs to Nango Cloud

```bash
# Deploy to development environment
pnpm nango:deploy

# Or deploy to production
cd nango-integrations
nango deploy --env production
```

## Adding a New Sync

### Step 1: Define the Data Model

Add TypeScript interface to `models.ts`:

```typescript
export interface MyNewData {
    id: string;
    name: string;
    value: number;
    timestamp: string;
}
```

### Step 2: Create Sync Function

Create `my-provider/my-sync.ts`:

```typescript
import type { NangoSync, MyNewData } from '../models';

export default async function fetchMyData(nango: NangoSync) {
    // Fetch data from API with automatic pagination
    const data = await nango.paginate<MyNewData>({
        endpoint: '/api/my-endpoint',
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'next_cursor',
            limit: 100
        }
    });

    // Save to Nango's cache (automatic change detection)
    await nango.batchSave(data, 'MyNewData');

    nango.log(`Synced ${data.length} records`);
}
```

### Step 3: Configure in nango.yaml

```yaml
integrations:
  my-provider:
    syncs:
      my-sync:
        runs: every 15 minutes
        description: "Sync my custom data"
        endpoint: GET /api/my-endpoint
        output: MyNewData
        sync_type: incremental
        auto_start: true
```

### Step 4: Update tRPC Router

Add your provider to `src/server/api/routers/integration.ts`:

```typescript
const syncMap: Record<string, string[]> = {
  // ... existing providers
  'my-provider': ['my-sync'],
};
```

### Step 5: Deploy

```bash
pnpm nango:deploy
```

Done! Nango will now run your sync automatically.

## Sync Types

### Incremental Syncs
- Only fetches changed/new data since last sync
- More efficient (saves API calls and bandwidth)
- Requires cursor/timestamp tracking
- Examples: `active-users`, `total-events`, `channel-messages`

### Full Syncs
- Fetches all data every time
- Simpler logic (no cursor management)
- Use for data that changes frequently or is small
- Examples: `conversion-rate`, `sheet-rows`, `active-users` (Slack)

## Configuration

### Per-Connection Config

Some syncs require per-connection configuration (e.g., which spreadsheet to sync, which channels to track).

Set this in the Integration metadata:

```typescript
// When creating connection
{
  connection_config: {
    spreadsheet_id: "abc123",
    range: "Sheet1!A1:Z100",
    funnel_steps: ["pageview", "signup", "conversion"]
  }
}
```

Access in sync function:

```typescript
const connection = await nango.getConnection();
const spreadsheetId = connection.connection_config.spreadsheet_id;
```

### Sync Metadata (Cursors)

For incremental syncs, store cursors:

```typescript
// Get last sync state
const lastState = await nango.getMetadata<{ lastTimestamp?: string }>();

// Fetch only new data
const data = await nango.get({
    endpoint: '/api/data',
    params: { after: lastState?.lastTimestamp }
});

// Update cursor for next sync
await nango.setMetadata({ lastTimestamp: latestTimestamp });
```

## Querying Synced Data

### From Your App (tRPC)

```typescript
// Get synced records from Nango's cache
const { data } = api.integration.getSyncedRecords.useQuery({
    connectionId: 'conn-123',
    integrationId: 'posthog',
    model: 'PostHogPerson',
    limit: 100
});

// Trigger a sync manually
await api.integration.triggerSync.mutate({
    connectionId: 'conn-123',
    integrationId: 'posthog',
    syncName: 'active-users'
});
```

### Webhooks

Your app receives real-time webhook notifications when data changes:

- `sync.success` - Sync completed
- `sync.error` - Sync failed
- `records.created` - New records added
- `records.updated` - Records changed
- `records.deleted` - Records removed

Handler: `src/app/api/nango/sync-webhook/route.ts`

## Best Practices

### 1. Use Incremental Syncs When Possible
- Save API quota
- Faster sync times
- Better for large datasets

### 2. Handle Rate Limits
Nango handles this automatically, but you can add:

```typescript
try {
    const data = await nango.get({ endpoint: '/api/data' });
} catch (error) {
    if (error.status === 429) {
        // Nango will automatically retry with backoff
        throw error;
    }
}
```

### 3. Log Progress
```typescript
nango.log(`Processing ${records.length} records`);
nango.log(`Completed sync for ${connection.id}`);
```

### 4. Validate Data
```typescript
const validRecords = records.filter(r => r.id && r.timestamp);
nango.log(`Filtered ${records.length - validRecords.length} invalid records`);
await nango.batchSave(validRecords, 'MyModel');
```

## Troubleshooting

### Sync Not Running
1. Check sync is enabled in nango.yaml
2. Check `auto_start: true` if it should start immediately
3. Manually trigger: `pnpm nango:deploy` then trigger via UI

### Data Not Appearing
1. Check Nango logs: `nango logs --sync <sync-name>`
2. Verify connection is active: `api.integration.getSyncStatus.useQuery()`
3. Check webhook handler logs for errors

### Authentication Errors
1. Verify Nango has valid OAuth credentials
2. Check token hasn't expired
3. Verify required scopes are configured

## Resources

- **Nango Docs**: https://nango.dev/docs
- **Nango Syncs Guide**: https://nango.dev/docs/guides/use-cases/syncs
- **Nango CLI Reference**: https://nango.dev/docs/reference/cli
- **Nango SDK**: https://nango.dev/docs/reference/sdk

## Support

For issues with:
- **Sync logic**: Check this README and Nango docs
- **Nango platform**: Visit https://nango.dev/support
- **Integration setup**: Ask in team chat or create an issue
