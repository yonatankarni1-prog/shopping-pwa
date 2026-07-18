# Free-tier operational notes

1. **Supabase Free pauses after ~7 days of inactivity.** This repo's
   `.github/workflows/supabase-keepalive.yml` runs a tiny authenticated
   read against `/rest/v1/households` daily (05:17 UTC) to keep the
   project active. If a pause happens anyway, recovery is: Supabase
   dashboard → project → **Restore**.
2. **GitHub disables scheduled workflows after 60 days without repo
   activity.** This app's real usage (family members using the PWA)
   doesn't touch the repo itself, so if there's a stretch of ~2 months
   with no commits, expect a "workflows disabled" email from GitHub.
   Re-enable it from the repo's **Actions** tab (or just push any
   commit, which re-activates scheduled workflows too).
3. **If a pause ever happens anyway:** the PWA shows the cached list
   read-only (from `useItems`'s localStorage cache) and every write
   fails with an error toast. No data loss — recovery is the Supabase
   dashboard **Restore** button, then a normal reload.
