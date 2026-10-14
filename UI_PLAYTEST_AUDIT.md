# BONES UI audit — 13 October 2026

## Result
The palette, original art, raised cabinet navigation, inline card selection and illustrated dialogs follow the design direction. Readability, compact-height layout, settings styling and primary-action hierarchy do not fully meet it. No gameplay source was changed during this audit.

## Evidence and scope
Fresh in-app browser checks: 320×568, 390×568, 844×390 landscape and 1280×900 desktop. Exercised menu/install help, six-player lobby, name editor, host controls, invite ticket, rooms, placement, bidding, reveal selection, Rules/settings and Home confirmation. Measured native controls and inspected computed styles. Reviewed the existing current-build champion screenshot for victory placement. Calculated contrast from SVG/CSS palette endpoints, not a complete pixel-by-pixel accessibility certification. Browser console contained no warnings/errors. Real notch/home-indicator devices were not available.

## Findings, severity order

### P1 — Six-player landscape reveal overlaps
Reproduce: six players → reveal → 844×390 landscape. Row height is 43px, but card strips remain 74px high and cards 64px minimum. Cards overlap subsequent player names and the flowers-left/action text. This obscures ownership and search instructions. Owner: network.js reveal layout and gameplay-controls.js minimum heights. Fix: compact-height layout with scrolling or a clear portrait requirement; preserve usable card sizes. Evidence: output/ui-qa/audit-landscape-844.png.

### P1 — Coloured names fail the normal-text contrast target
Reproduce: six-player reveal, inspect Bot 3 (violet) and Bot 5 (orchid). Violet/felt is 1.93–3.14:1; orchid/felt 2.36–3.84:1 across the felt gradient. Other seat colours also fall below 4.5:1 on its lighter areas. Names are small normal text, making ownership hard to read. Owner: network.js reveal name rendering. Fix: ivory names with player colours reserved for markers, card backs and borders. Evidence: output/ui-qa/audit-reveal-six-320.png. Main ivory/ink button text is 8.31:1; dark/coral primary text 5.96:1; muted/dialog body at the light gradient endpoint 4.92:1.

### P2 — Long names shrink into illegible text
Reproduce: set name to “Alexandria the Unbeatable Champion”, then start with six players at320×568. Canvas fillText(maxWidth) compresses the full name into the seat label; it becomes tiny rather than wrapping or truncating. The search summary also compresses a long name alongside its count. Owner: src.js txt() and network.js seat/summary labels. Fix: truncate at a stable font size with an ellipsis; expose the full name in an accessible label or detail view. Evidence: output/ui-qa/audit-placement-six-320.png.

### P2 — Vibration control is an unstyled browser button
Reproduce: Rules → scroll to bottom. Vibration Off is a default grey browser control, 117×21.5px, immediately above the illustrated Done button. It violates the arcade material language and has a small touch target. Owner: rulebook.js .haptics-toggle and style.css. Fix: themed 44–48px minimum settings button, matching typography and focus treatment. Evidence: output/ui-qa/audit-rulebook-settings.png.

### P2 — Primary room creation loses its visual priority
Reproduce: open Rooms. Create Another Room looks identical to secondary Back/Home controls. The later arcade-dialog ID selector overrides .room-primary's coral background and ink text. Owner: style.css cascade. Fix: explicit primary variant after shared dialog rules. Current computed background is plum rgb(76,60,98), rather than coral.

### P2 — Small labels and some canvas targets
Reproduce: opening screen at320×568. Install App is 36.1px high. Reveal Bottom/Top/Safe labels are9px. Six-seat information renders around9–11px after canvas scaling. Lobby Share Invite and champion Play Again scale52 logical pixels to42.7 physical pixels at320px width. Owner: src.js canvas button sizing, network.js text sizing and style.css played-card labels. Fix: physical minimum44px for controls, increase critical labels to12–14px while adjusting spacing. Positive: bids measure50.3×44px; reveal cards58.5×76.9px; dialog buttons48px; navigation around51px high.

### P2 — Bottom controls lack safe-area allowance
Code/geometry finding: only setup applies env(safe-area-inset-*). At320×568 six-player reveal, confirmation ends at561.9px, leaving6.1px to the screen edge. A physical home-indicator device may obscure it. Owner: canvas height/geometry and fixed DOM overlays. Fix: reserve safe-area padding consistently for canvas and overlays. Needs real-device verification; browser viewport simulation did not emulate a notch.

### P3 — Host popup exit is below the fold
Reproduce: six players → Host at320×568. The scrollable roster puts Done beneath all five guest rows (top684.8px). Users must scroll to leave using a visible button. Owner: host dialog layout. Fix: persistent top-right Close control or sticky Done, with settings outside the destructive roster. Existing scrolling works and row buttons are48px high.

## Checks that passed
- Cabinet navigation captions are distinct and remain within the header.
- Portrait six-player hand, bid controls and score sockets have separate regions.
- Native card selection remains inline, with visible highlight and confirmation.
- Invite, name, install and leave dialogs use original art and readable body text.
- Home confirmation highlights Stay & Play and separates Go Home.
- Desktop reveal spacing has no observed overlap at1280×900.
- Champion art, scores and Play Again are visually separated in the existing320px screenshot.
- Focus rings are visible; keyboard navigation can open/close dialogs and place/bid.

## Limits
This was a UI audit, not another complete gameplay regression suite. Offline/error/elimination/choose-lead states received source review, not fresh live screenshots. Full-stack scrolling, animation timing and reduced motion were tested in the preceding gameplay pass. LAN reachability, physical vibration and installed PWA behaviour remain device checks.

## Resolution — same-day implementation
All eight findings addressed. Short-height canvases scroll; fixed controls follow scrolling. Names use ivory; text truncates without shrinking and has12px minimum physical sizing. Labels are12px, canvas buttons minimum44px. Safe-area padding reserves device insets, with a minimum usable canvas height. Vibration uses a48px themed button. Room creation is coral again. Host has a visible sticky close button; settings remain in Rules. Verified six-player320×568 and390×568, landscape844×390 including select→scroll→confirm→flower, long names, settings/room/host dialogs and44px Install target.36 tests/build pass; browser console clean. Physical notch/home-indicator behavior still requires a device check. Screenshots: output/ui-qa/fixed-reveal-six-320.png and fixed-landscape-scrolled.png.
