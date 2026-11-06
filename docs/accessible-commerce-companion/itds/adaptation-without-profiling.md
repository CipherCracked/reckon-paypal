# Accessible Commerce Companion — ITDs

| ITD 9 — *"Adapt with CSS custom properties and browser-local preferences read in an effect, never with a server round-trip or a guess about the reader."* |  |
| :---- | :---- |
| **THE PROBLEM** | IPD 10 promises a page that is already accessible by default, plus text size, presentation density and read-aloud that the reader controls. Implementing that badly reintroduces everything IPD 5 and IPD 4 refused: a hydration mismatch that flickers the layout, a preferences API that quietly stores a profile, or a "one figure at a time" mode that shreds the description list a screen reader depends on. |
| **OPTIONS CONSIDERED (Decision in bold)** | 1. **Preferences in `localStorage` under one key, read once in a mount effect and applied as CSS custom properties on the section; density implemented by hiding items with CSS, not by rendering different markup; read-aloud through `speechSynthesis` with cancel on unmount and on figure change.**<br>2. Preferences in a cookie, read on the server so the first paint is already correct.<br>3. Preferences in a server-side profile keyed to a session id.<br>4. Density by conditionally rendering one figure instead of three. |
| **REASONING** | Option 1 keeps every byte of preference on the device, survives storage being blocked (the effect wraps reads in `try/catch` and falls back to defaults), and never changes the DOM structure — so the `<dl>` is always whole, screen readers always get all three figures, and only the visual presentation changes. Option 2 is the classic accessibility answer to flicker, and it is storage: a cookie carrying display needs is a record about a person on our side of the wire, which is what IPD 4 forbids. Option 3 is a profile by another name. Option 4 would satisfy the letter of "one at a time" and break the reader who navigates by list — CSS hiding with all items still announced is the honest version. |
| **TRADEOFFS** | A small flash on first load where the stored size is applied after mount; mitigated by applying scale to a wrapper that starts at the default and by keeping the transition short. CSS-hiding means a sighted keyboard user can tab to an element they cannot see unless focus pulls it back into view — so a hidden figure must be revealed on focus, or the control must be scoped to the figures' container only. Read-aloud quality depends on installed voices; it is not tested for accuracy, only for start/stop behaviour. |
| **NOTES** | `prefers-reduced-motion` respected throughout. The controls are a real `<fieldset>` with a legend, keyboard-operable, and their state changes are announced through a polite live region. Defaults are the accessible values — the product does not ship an "accessible" option. |

---

**Revision — 2026-11-07: what exists, and what this changes.**

**As-built.** One fixed rendering, no preferences, no read-aloud, no controls. Base styles are in
`app/globals.css` and the figures are a single `<dl>` of three `<div>`s inside `CommitmentView`. The
layout is already WCAG 2.2 AA by IPD 5's standard; what it lacks is any room for a reader whose needs
sit outside that single setting.

**What this changes, and what it must not.** Additive only: a controls block, a preferences hook, and
CSS variables that scale type. `CommitmentView`'s semantics, the figures, the ordering from ITD 7, and
every PayPal path stay as they are. No new route, no new dependency, no key.

**The test that matters.** Seeding `localStorage` with a preference and rendering must (a) not throw
when storage is unavailable, (b) still expose all three figures to `getByRole("definition")`, and
(c) apply the chosen scale to the section. Those three assertions are the difference between an
affordance and a mode, and they are the ones a future edit is most likely to break.
