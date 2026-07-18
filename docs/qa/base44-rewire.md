# Base44 Rewire — Task 12 (2026-07-18)

Executed by Claude via Playwright against the Base44 superagent ("Vesper") chat; Vesper performed the code change, deploy, and dry test itself. Step 0 preflight captured BEFORE any change.

## Rollback ledger (old config, captured by Vesper before editing)

- **URL:** `${GATEWAY_URL}/shopping/items/batch` = `https://shopping-bot-app-production.up.railway.app/shopping/items/batch`
- **Auth header:** `Authorization: Bearer ${GATEWAY_TOKEN}`
- **Body:** `{ items: string[], chat_id, message_id, user_id, raw_message, idempotency_key, action_type: 'batch_add' }`
- **Response semantics:** 200 = success, 423 = already processing, 503 = PendingSync; items with `status:"duplicate"` create ConfirmationState.

**Rollback = restore exactly these values in `handleBatchAdd` (gatewayClient.ts).** Gateway/Railway still deployed and untouched.

## What changed (add flow ONLY)

- `handleBatchAdd` now POSTs to `https://izynyrpgulwykxeuepzc.supabase.co/functions/v1/ingest`
- Header: `x-ingest-secret: ${INGEST_SECRET}` (secret stored in Base44 secrets store via its secure form — not in chat)
- Body: `{"items":[{"name":"..."}]}` (≤25)
- Semantics: 200 = all landed → "הוספתי: X ✓"; 207 = partial (report only created/existing); 401/400/5xx = failure, NO auto-retry, no PendingSync
- Added `extractIngestItems()` — parses `results` (Supabase shape) with `items` fallback
- All other flows (list, search, delete, mark_bought, clear, pending_status) — unchanged, still on the old Gateway

## Dry test results (no group messages sent)

- POST `{"items":[{"name":"טסט-בייס44"}]}` → HTTP 200, `user_message: "הוספתי: טסט-בייס44 ✓"`
- Second run → `status: "existing"`, `qty: 2` — dedup confirmed from the Base44 side
- Verified independently in Supabase: row landed in the production household with `source='whatsapp'`, then deleted (cleanup)
- Old-Gateway flows re-tested by Vesper: list 200, working

## Remaining for full Task 12 closure

- [ ] Live canary in the WhatsApp group '🛒 סופר חדש': send `תוסיף במבה` → bot replies "הוספתי ✓" once → item appears in the PWA with 💬
- [ ] iPhone checklist row 11
