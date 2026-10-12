Goal: turn the matte BONES wordmark into a clear, modern game theme with illustrated help and playful audio.
Scope: menu, game controls, cards/panels, setup, a phone-readable rulebook, hover/press feedback, opt-in sound cues; preserve authoritative rules and multiplayer behavior.
Approach: soften the existing SVG/canvas palette, add a DOM rulebook using actual game art, and synthesize short bone-like effects from Web Audio after user interaction.
Risks: readability on small phones, audio autoplay limits, and unverified browser visuals because Playwright Chromium is missing.
Verification: build and 11 tests pass; 18 SVGs, app icons, rulebook art, offline cache and syntax checks pass. The prescribed Playwright client lacks Chromium, and local in-app browser access was rejected; real phone visual/audio QA remains before publication.
