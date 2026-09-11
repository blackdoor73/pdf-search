# Advertising — architecture and setup

The ad system is **built and shipped, but inert**. Nothing loads and no slot
renders until `NEXT_PUBLIC_ADSENSE_CLIENT` is set. You can deploy this safely
before you have an AdSense account.

---

## Design decisions

**One right-margin rail, desktop only.** The content column is `max-w-5xl`
(1024px) centred, leaving ~200px per side at 1440px and ~128px at 1280px. A
160×600 IAB wide skyscraper fits the wider case; below `AD_RAIL_MIN_WIDTH`
(1280px) the rail is not rendered at all. It is never squeezed, never stacked
into the content, never shown on mobile.

**Only the right side is used.** Filling both margins frames the tool in
advertising and reads as a cheap site. One rail reads as a sponsor slot.

**The space is reserved.** The container is a fixed 160×600 whether or not an
ad fills it. The loudest complaint about the reference site's ads (monkeytype
issue #928) is that content moves as ads load — worse on a results list than a
typing test.

**On by default, with a real off switch.** Turning ads off means the AdSense
script is *never downloaded*, not merely hidden. It is honour-system: no
membership check, because an OAuth flow plus the "I supported but still see
ads" support burden costs more than it saves at this traffic level.

**Never in the search workspace.** No ads in results, no interstitials, no
sticky units, no auto-refresh. The tool stays clean; the margin pays.

---

## What is in the code

| File | Role |
|---|---|
| `src/lib/ads/prefs.ts` | Pure preference + visibility logic. Unit-tested. |
| `src/components/ads/AdRail.tsx` | The rail. Renders `null` without a publisher id. |
| `src/components/ads/AdScript.tsx` | Loads AdSense, only when wanted. In the root layout. |
| `src/components/ads/AdPreference.tsx` | On/off control on `/support`. |
| `src/app/ads.txt/route.ts` | Authorized-sellers file. 404s until configured. |
| `next.config.js` | CSP entries for the ad domains. |

Analytics: `ad_pref_changed` fires on every toggle. **Opt-out rate is the
metric that decides whether the rail stays** — watch it before revenue.

---

## Setup, in order

### 1. Prerequisites (before applying)

- [ ] `/privacy`, `/about`, `/contact` deployed and reachable. AdSense
      requires all three. They exist in this branch.
- [ ] Site on HTTPS with original content. Already true.
- [ ] GA4 running, with at least a few weeks of traffic data, so you can tell
      whether content pages or the tool carry your visitors. **If the tool
      dominates, the rail may not be worth running at all** — decide with data.

### 2. Apply to AdSense

1. Sign up at <https://adsense.com> with the site's domain.
2. Add the verification snippet **or** confirm ownership via the existing
   Search Console verification, which is already in `layout.tsx`.
3. Wait for review. Days to a few weeks.

> If rejected, do not retry blindly — the rejection email names the reason.
> Thin content and missing policy pages are the usual causes, and the second
> is already handled here.

### 3. Create the ad unit

In AdSense → **Ads → By ad unit → Display ad**:

- Name: `rail-160x600`
- Type: **Vertical / fixed size**, set to **160 × 600**
- Copy the **slot id** from the generated snippet (the `data-ad-slot` value).
  Ignore the rest of the snippet — the component supplies it.

### 4. Set the environment variables in Vercel

```
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-0000000000000000
NEXT_PUBLIC_ADSENSE_RAIL_SLOT=0000000000
```

Both are public by nature — a publisher id appears in the page source of
every AdSense site. Redeploy after setting them.

### 5. Turn on the consent tool — REQUIRED before EEA/UK/Swiss traffic

Serving **personalised** ads to the EEA, UK, or Switzerland requires a
Google-certified CMP integrated with the IAB TCF. Publishers had to be on
TCF v2.3 from 28 February 2026.

**Do not hand-build a cookie banner** — a custom banner is not certified and
will not satisfy the requirement.

Use Google's own certified CMP instead:

1. AdSense → **Privacy & messaging** → **European regulations**
2. Create the message, select your site, publish.

It is free, certified (TCF ID 300), and loads only for visitors in the
affected regions. No code change here.

Without it, EEA/UK/CH traffic is limited to non-personalised or limited ads.

### 6. Verify after deploying

- [ ] `/ads.txt` returns the `google.com, pub-…, DIRECT, …` line (404 before
      configuration is correct).
- [ ] The rail appears at ≥1280px wide, and is absent at 1279px and on mobile.
- [ ] No CSP violations in the browser console.
- [ ] "Turn off ads" hides the rail, and the AdSense script stops loading on
      the next reload (check the Network tab).
- [ ] `/support` can turn it back on.
- [ ] AdSense → Ads → check the unit reports impressions within ~24h.

### 7. Update the copy when ads go live

`/support` and `/privacy` describe advertising conditionally and already
cover the live case. Re-read both once ads are actually serving and confirm
they still match reality.

---

## Alternatives worth knowing

AdSense is the easiest start, not the best payer.

- **Ezoic** raised its floor to 250k users/month (Feb 2026).
- **Mediavine Journey** accepts from **1,000 sessions/month** (Jan 2026) and
  pays materially better than AdSense. This is the realistic upgrade.
- **Mediavine** main network is now revenue-gated ($5k/year).

Switching networks means changing `AdScript.tsx` and the `<ins>` element in
`AdRail.tsx`. The preference logic, reserved space, and CSP structure carry
over unchanged.

---

## Honest expectations

Utility sites with short sessions typically see page RPMs around **$1–3**. At
low traffic that is single-digit dollars a month. The rail's near-term value
is validating the mechanism and the opt-out rate — not the revenue. Judge it
on whether people turn it off, and revisit once traffic is real.
