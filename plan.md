Goal: simplify victory and support consensual rematches plus host seat management.
Scope: winner-only layout/Home; rematch opt-ins/count; lobby empty-seat bots and confirmed kicks.
Approach: capability-gated client controls and authoritative per-seat rematch flags; preserve legacy host rematch compatibility.
Risks: duplicated votes, disconnected seats, seat reindexing, narrow-phone overlap.
Verification: full suite, vote/partial-lobby regressions, browser winner/guest CTA and bot add/cancel/confirmed removal.

Status: implemented; 50 tests/build pass. Browser verified winner/guest flow, host Manage Seats, real local bot fill/removal confirmation, and narrow-phone spacing. Public server needs update for opt-in protocol.

Goal: verify every reachable screen and popup after fluid-width changes.
Scope: home, setup/loading/error, lobby, place/add/bid/reveal/loss/lead/result/win/pause, name/menu/rules/install/host/invite/removal/leave/peek dialogs.
Approach: isolated controlled-state browser fixtures for conditional screens; actual UI interactions for overlays; fix shared scaling defects.
Risks: canvas versus DOM coordinate mismatch, stretched artwork, clipped or unreachable controls at short heights.
Verification: screenshots at narrow phone and desktop for all main states; tablet/landscape representative checks, popup keyboard dismissal and input; automated suite. Physical devices and native install/share prompts remain outside this pass.

Status: screen/popup pass completed. Shared artwork, avatar, card-outline/hit-target, reconnect and landscape host-close defects fixed and retested. 58 tests passed; final build/diff checks passed. Detailed evidence: docs/RESPONSIVE_AUDIT.md.

Goal: replace stretched desktop rendering with a genuine desktop layout and repair Menu activation.
Scope: proportional desktop coordinate system, three-column shared seat/card components, compact action zones, desktop home; preserve phone UI and shared dialogs.
Approach: uniform scaling with viewport-aware logical width; dedicated desktop composition reusing rendering/control primitives and authoritative actions. Stabilize Menu DOM between frames.
Risks: canvas/DOM hit-area mapping, reveal card placement, orientation transitions, animations and focus.
Verification: phone/desktop screens and dialogs, animated pointer/keyboard Menu, card/bid/reveal/rematch actions, automated suite and build.

Status: complete. Desktop phase/home screenshots and phone/tablet/laptop checks passed; Menu pointer/keyboard and real local bot-table actions verified. Responsive reveal callback fixed. 59 tests and production build passed; physical devices and deployment remain unverified.

Goal: center empty-seat content and victory actions; enrich winning feedback. Scope: shared seat geometry, desktop action grouping, shared flower/star crown accents and bounded confetti; preserve reduced motion and immediate actions. Risks: short-screen button overlap and input gating. Verification: desktop lobby/win and phone win screenshots, reduced motion, rematch, build/layout checks.

Status: complete. Desktop lobby, host/guest victory, phone victory and reduced-motion laptop layouts checked; Manage Seats returns to lobby. Build/layout tests/diff check passed.
