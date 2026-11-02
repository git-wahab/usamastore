# Facebook Auto-Authorization on Account Page — Implementation Plan

## Goal

When a logged-in customer opens `/account`:

- **Already authorized with Facebook** → show the Facebook name (current behaviour).
- **Not authorized** → automatically send them to Facebook to authorize, then bring them back to `/account` with the account linked.

Today this only happens when the customer clicks the **Authorize / Re-authorize** button.

## Approach: client-only (theme changes only)

- **No new smart_cart APIs.** Uses the existing `GET` / `POST` / `DELETE /api/customer`.
- Same trust model as today (the backend accepts `shopify_id` and `name` from the browser). Hardening is a separate, later task — see [Future: server-side hardening](#future-server-side-hardening).

### Why not just auto-click the current button?

The current `<fb:login-button>` (Facebook JS SDK) opens a **popup**. Browsers block popups that are not started by a user click, and the SDK has no redirect mode. So:

- The **JS SDK** is used only for a silent check (`FB.getLoginStatus()`), which needs no popup.
- The automatic opening uses a plain **full-page redirect** to Facebook's OAuth dialog (`response_type=token`), which browsers never block.

`BASE` below = `RESERVE_PRODUCT_BASE_URL` (smart_cart, `https://smartcart.robustapps.dev`).

---

## API sequence

### A. Customer is already linked

| # | Method | API | Result |
|---|---|---|---|
| 1 | `GET` | `BASE/api/customer?shopify_id={customerId}` | `200`, `error: false` → show `data.facebook_name`. **Done.** |

### B. Not linked, but Facebook already recognises the customer (silent, no redirect)

| # | Method | API | Result |
|---|---|---|---|
| 1 | `GET` | `BASE/api/customer?shopify_id={customerId}` | `200`, `error: true` → continue |
| 2 | SDK | `FB.getLoginStatus()` | `connected` |
| 3 | SDK | `FB.api('/me', { fields: 'id,name' })` | Facebook `id`, `name` |
| 4 | `POST` | `BASE/api/customer` `{ shopify_id, facebook_id, name }` | Saved |
| 5 | — | — | Show Facebook name |

### C. Not linked, redirect to Facebook

| # | Method | API | Result |
|---|---|---|---|
| 1 | `GET` | `BASE/api/customer?shopify_id={customerId}` | `200`, `error: true` → continue |
| 2 | SDK | `FB.getLoginStatus()` | `not_authorized` / `unknown` / timeout → continue |
| 3 | redirect | `https://www.facebook.com/v26.0/dialog/oauth?client_id=3678933285602039&redirect_uri=https://<store>/account&response_type=token&scope=public_profile&state={state}` | Customer logs in / approves |
| 4 | redirect | `https://<store>/account#access_token=...&expires_in=...&state=...` | Back on account page |
| 5 | `GET` | `https://graph.facebook.com/v26.0/me?fields=id,name&access_token={token}` | Facebook `id`, `name` |
| 6 | `POST` | `BASE/api/customer` `{ shopify_id, facebook_id, name }` | Saved |
| 7 | — | — | Show Facebook name |

### D. Customer cancels on Facebook

| # | Method | API | Result |
|---|---|---|---|
| 4 | redirect | `https://<store>/account?error=access_denied&error_reason=user_denied&state=...` | Show manual Authorize button, **no auto-redirect** |

### E. Remove authorization (unchanged)

| Method | API | Body |
|---|---|---|
| `DELETE` | `BASE/api/customer` | `{ shopify_id }` |

---

## Implementation steps

### 1. Facebook App configuration (Meta developer console)

- **Facebook Login → Settings → Valid OAuth Redirect URIs**: add `https://<store>/account` for **every domain customers use** (custom domain and, if used, `*.myshopify.com`). The redirect URI must match exactly.
- **App Domains**: include the store domain(s).
- **Client OAuth Login** and **Web OAuth Login**: enabled.
- App is in **Live** mode.
- App ID: `3678933285602039` (no secret needed for this approach).

### 2. Fix `getFacebookAccount()` — `layout/theme.liquid`

smart_cart's `GET /api/customer` never returns 404. "Not found" is HTTP `200` with:

```json
{ "error": true, "message": "Facebook account not found" }
```

The current code checks for `404` and only works because `data` is `undefined`. Change it to:

- `200` and `error: false` → return `data`
- `200` and `error: true` → return `null` (not linked)
- non-2xx / network error → **throw**

Throwing on errors ensures a smart_cart outage never redirects every customer to Facebook.

Update the caller in `sections/header.liquid` (announcement bar) to wrap the call in `try/catch` so a thrown error just leaves the bar hidden.

### 3. Fix `saveFacebookAccount()` — `snippets/facebook-auth.liquid`

It calls `response.json()` twice (the second call throws because the body is already consumed) and reads `.data` from a Promise. Read the body once:

```js
const json = await response.json();
return json.data;
```

Also throw if `!response.ok` so the UI can show an error toast.

### 4. Add helpers — `snippets/facebook-auth.liquid`

- `buildFacebookOAuthUrl()`
  - Generate `state` with `crypto.getRandomValues` (hex string), save to `sessionStorage.fbOAuthState`.
  - `redirect_uri = window.location.origin + '/account'`.
  - Return the dialog URL from sequence C, step 3.
- `redirectToFacebook()` → `window.location.href = buildFacebookOAuthUrl()`.
- `getSdkLoginStatus(timeoutMs = 3000)` → loads the SDK if needed, wraps `FB.getLoginStatus()` in a Promise, and resolves `'unknown'` on timeout (SDK blocked by an ad blocker, or no callback).
- `linkFacebookAccount(facebookId, name)` → `saveFacebookAccount(name, customerId, facebookId)`, then re-render the status.

### 5. Handle the return from Facebook — run first on page load

1. **Success** — `location.hash` contains `access_token`:
   - Parse `access_token` and `state` from the hash.
   - Immediately remove the hash: `history.replaceState(null, '', location.pathname)`.
   - If `state !== sessionStorage.fbOAuthState` → show error toast, stop.
   - Remove `sessionStorage.fbOAuthState`.
   - `GET https://graph.facebook.com/v26.0/me?fields=id,name&access_token=...`.
   - `linkFacebookAccount(id, name)`, show success toast.
2. **Cancelled / error** — `location.search` contains `error`:
   - Clean the URL with `history.replaceState`.
   - Set `sessionStorage.fbAutoAuthAttempted = '1'`.
   - Show "Facebook authorization was cancelled" toast.

### 6. Rewrite `getCurrentStatus()` — `snippets/facebook-auth.liquid`

```
account = await getFacebookAccount(customerId)   // may throw

if account:
    show name (existing UI: name, Re-authorize, Remove)
    return

status = await getSdkLoginStatus()
if status.status === 'connected':
    me = await FB.api('/me', { fields: 'id,name' })
    linkFacebookAccount(me.id, me.name)
    return

if sessionStorage.fbAutoAuthAttempted !== '1':
    sessionStorage.fbAutoAuthAttempted = '1'
    show "Redirecting to Facebook…"
    redirectToFacebook()
    return

show manual Authorize button

on error (getFacebookAccount threw):
    show manual Authorize button, no redirect
```

### 7. Replace the SDK popup button

Replace the `<fb:login-button>` markup in `fbIframeInit()` with a plain button styled like the existing one:

- Not linked → label **"Authorize your account"**
- Linked → label **"Re-authorize?"**
- Click → `redirectToFacebook()`

This gives one code path for both automatic and manual authorization.

Remove from the snippet:

- `fbIframeInit()` and the `#FBiframeWrapper` popup button styles
- `checkLoginState()` and `statusChangeCallback()`
- The `FB.getLoginStatus` call inside `window.fbAsyncInit` (it currently runs on **every** page load, even when already linked). Keep `FB.init(...)` only; the silent check now lives in `getSdkLoginStatus()`.

### 8. Remove authorization button

After a successful `DELETE BASE/api/customer`, set `sessionStorage.fbAutoAuthAttempted = '1'` so the customer isn't immediately sent back to Facebook.

### 9. Avoid the page flash

The status check runs in the browser, so the page renders briefly before any redirect. Show a small loader in the Facebook section until `getCurrentStatus()` finishes, and show "Redirecting to Facebook…" right before redirecting.

---

## Edge cases

| Case | Behaviour |
|---|---|
| Already linked | Name shown, no SDK check, no redirect |
| Facebook already recognises the customer | Linked silently, no redirect |
| Safari / third-party cookies blocked | `getLoginStatus` returns `unknown` → normal redirect flow |
| SDK blocked by an ad blocker | Times out after 3 s → normal redirect flow |
| Customer cancels on Facebook | Back with `?error=access_denied`, manual button, no loop |
| `state` mismatch | Error toast, nothing saved |
| smart_cart down / non-2xx | No redirect, manual button shown |
| Customer removes authorization | No auto-redirect for the rest of the browser session |
| New browser session after cancelling | Auto-redirect happens once again |

## Testing checklist

- [ ] Linked customer → name shown, no redirect.
- [ ] Unlinked customer, already approved app on Facebook (Chrome) → linked silently.
- [ ] Unlinked customer, never approved → redirected to Facebook automatically.
- [ ] Approve on Facebook → back on `/account`, URL hash removed, name shown, record in smart_cart.
- [ ] Cancel on Facebook → back on `/account`, manual button shown, no loop.
- [ ] Safari → redirect flow works.
- [ ] Ad blocker blocking `connect.facebook.net` → redirect flow still works.
- [ ] smart_cart returns 500 → no redirect.
- [ ] Remove authorization → no immediate redirect; manual button works.
- [ ] Manual Authorize / Re-authorize button → same redirect flow.
- [ ] Tampered `state` in the hash → rejected.
- [ ] Announcement bar in `sections/header.liquid` hides after linking and doesn't break on API errors.
- [ ] Both custom domain and `*.myshopify.com` (if used) redirect back correctly.

## Files to change

| File | Change |
|---|---|
| `layout/theme.liquid` | `getFacebookAccount()` error handling (step 2) |
| `sections/header.liquid` | `try/catch` around `getFacebookAccount()` (step 2) |
| `snippets/facebook-auth.liquid` | Steps 3–9 |
| smart_cart | None required |

## Decisions

1. **Auto-redirect applies to all logged-in customers** on `/account`, regardless of `lvl` tags. No tag check is added to `snippets/facebook-auth.liquid`. (The announcement bar in `sections/header.liquid` keeps its existing `lvl` tag condition.)
2. **Keep the Re-authorize button** for already-linked customers, alongside the Facebook name and the Remove button. It uses the same redirect flow (step 7).

## Related smart_cart issues (recommended, not required)

- **Metafield GID likely double-prefixed.** `App\Actions\CreateFacebookCustomer` receives `shopify_id` already as `gid://shopify/Customer/123` and builds `ownerId` as `"gid://shopify/Customer/{$customer['shopify_id']}"`. The `facebook_name` metafield write likely fails silently (`userErrors` aren't checked). Not yet verified against Shopify.
- **`facebook_id` is not stored.** `POST /api/customer` ignores it and `customers` has no column for it. Add a migration only if you want to keep it.

## Out of scope

The existing `POST BASE_URL_ACCOUNT/api/facebook-account-with-name` call in `sections/main-account.liquid` (localStorage `customerName` + reserve-item flow) is not touched.

---

## Future: server-side hardening

Do this as a separate task if you want the backend to verify Facebook identities instead of trusting the browser. Facebook names are used to match Facebook reservations/invoices to Shopify customers, so a customer could currently link a name that isn't theirs.

**Only worth doing together with closing `POST /api/customer`**, otherwise the open endpoint can still be used to link any name.

New smart_cart APIs:

1. `GET /api/facebook/auth?shopify_id=`
   - Generate `state`, `Cache::put(state → shopify_id, 10 min)`.
   - `302` to the Facebook dialog with `response_type=code` and `redirect_uri=BASE/api/facebook/callback`.
2. `GET /api/facebook/callback?code=&state=`
   - Validate and consume `state`; on `error` → redirect to `/account?fb_error=denied`.
   - `GET https://graph.facebook.com/v26.0/oauth/access_token?client_id=...&client_secret=...&redirect_uri=...&code=...`
   - `GET https://graph.facebook.com/v26.0/me?fields=id,name&access_token=...`
   - Save via `CreateFacebookCustomer`, redirect to `/account?fb_status=connected`.

Also:

- Add `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` to `config/services.php` and `.env`.
- Change the Facebook App redirect URI to `BASE/api/facebook/callback`.
- Remove or protect `POST /api/customer`.

Theme impact is small: `redirectToFacebook()` points to `BASE/api/facebook/auth?shopify_id=...` instead of building the dialog URL, step 5 reads `fb_status` / `fb_error` instead of the hash, and saving moves to the backend.
