# NEXORA Browser QA Evidence — v0.88

> Historical evidence: this file records the v0.88 route/navbar browser pass
> that was included in the tagged v0.89 evidence milestone. It does not describe
> the v0.90 behavior changes. See
> [BROWSER_QA_V0_90.md](BROWSER_QA_V0_90.md) for that release's local evidence
> and [BROWSER_QA_V0_91.md](BROWSER_QA_V0_91.md) for pending hosted validation.

## Scope

This browser QA pass validates the NEXORA frontend after the v0.88 navbar active route indicator milestone.

Validated routes:

- /
- /deals
- /giveaways
- /wishlist
- /sentinel
- /security
- /settings
- /login
- /register

Tested viewports:

- Desktop: 1440 x 900 px
- Mobile: 390 x 844 px

Test method:

- Automated headless Chrome browser QA
- Chrome DevTools Protocol inspection
- DOM checks
- Console/runtime error checks
- Horizontal overflow checks
- Visual layout review
- Fallback/error state review

## Summary Result

All tested routes passed.

| Route | Desktop | Mobile | Overall |
|---|---:|---:|---:|
| / | PASS | PASS | PASS |
| /deals | PASS | PASS | PASS |
| /giveaways | PASS | PASS | PASS |
| /wishlist | PASS | PASS | PASS |
| /sentinel | PASS | PASS | PASS |
| /security | PASS | PASS | PASS |
| /settings | PASS | PASS | PASS |
| /login | PASS | PASS | PASS |
| /register | PASS | PASS | PASS |

Overall result: 9 / 9 routes PASS.

## Key Findings

### Navigation

- Active route indication works on routes that render the cinematic navbar.
- Active desktop links use the persistent navLinkActive state.
- Active mobile menu links use the persistent menuLinkActive state.
- Active links expose aria-current="page".
- Inactive navigation links still show hover underline animation.
- Home route correctly activates the brand/home link.
- Login and register pages intentionally do not render the main navbar.

### Layout

- No horizontal overflow was detected on desktop or mobile.
- Mobile layouts stack correctly at 390 px width.
- Desktop layouts remain aligned at 1440 px width.
- No major text clipping or visual overlap was detected.
- Product, system, settings, and auth pages preserve the cinematic dark/liquid-glass visual language.

### Runtime Stability

- No unhandled frontend runtime errors were detected.
- No visible error overlays were detected.
- Pages render without crashes or hydration mismatch indicators.

### Fallback Handling

The frontend remains usable when backend-dependent data is unavailable.

Observed graceful fallback behavior includes:

- Homepage discovery standby state
- Deals fallback preview state
- Giveaways fallback preview state
- Wishlist public preview/auth fallback state
- Sentinel local/static preview state
- Security static preview state
- Settings static preview state
- Login/register backend-unavailable error handling

## Result

This QA pass supports the v0.88 milestone as browser-tested on both desktop and mobile.

No code fixes were required from this QA pass.
