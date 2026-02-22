# Summary 05-01: Enable Time Travel Queries for Audit

## Completed: 2026-01-23

## What Was Done

Created `db/time-travel.ts` with utility functions for querying historical data.

## Functions Added

### `queryAtTime<T>(tableName, timestamp, columns?, where?)`
Query a table as it existed at a specific point in time.

```typescript
import { queryAtTime } from '@/db/time-travel'

// Get all beneficiaries from 1 hour ago
const result = await queryAtTime('beneficiary', new Date(Date.now() - 3600000))

// Get specific fields with filter
const result = await queryAtTime(
  'beneficiary',
  '2026-01-22T12:00:00Z',
  ['id', 'name', 'share_percent'],
  'id = 123'
)
```

### `compareWithHistory<T>(tableName, timestamp, idColumn, id)`
Compare current data with historical data to see what changed.

```typescript
import { compareWithHistory } from '@/db/time-travel'

const { current, historical, changes } = await compareWithHistory(
  'beneficiary',
  '2026-01-20',
  'id',
  123
)

// changes = [{ field: 'share_percent', was: '10.00', now: '15.00' }]
```

### `getRestoreWindow()`
Get the available time range for queries.

## Configuration Required

To extend the restore window (default 1 day):

1. Go to Neon Console → Project Settings
2. Under "History retention" adjust the window
3. Longer windows = more storage cost

| Plan | Max Window |
|------|------------|
| Free | 6 hours |
| Launch | 7 days |
| Scale | 30 days |

## Use Cases

- **Audit compliance**: "What was this beneficiary's share % on date X?"
- **Debugging**: "What did the data look like before the bug?"
- **Recovery**: "Who changed this record and when?"
- **Reporting**: "Compare trust values month-over-month"

## Files Changed

- `db/time-travel.ts` - New file with time travel utilities
