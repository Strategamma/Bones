Goal: simplify victory and support consensual rematches plus host seat management.
Scope: winner-only layout/Home; rematch opt-ins/count; lobby empty-seat bots and confirmed kicks.
Approach: capability-gated client controls and authoritative per-seat rematch flags; preserve legacy host rematch compatibility.
Risks: duplicated votes, disconnected seats, seat reindexing, narrow-phone overlap.
Verification: full suite, vote/partial-lobby regressions, browser winner/guest CTA and bot add/cancel/confirmed removal.

Status: implemented; 50 tests/build pass. Browser verified winner/guest flow, host Manage Seats, real local bot fill/removal confirmation, and narrow-phone spacing. Public server needs update for opt-in protocol.
