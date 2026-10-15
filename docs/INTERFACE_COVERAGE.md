# Interface upgrade coverage — 14 October 2026

Evidence labels: **Browser** = actual local served build; **Automated** = rule/WebSocket test; **Review** = inspected source only; **Pending** = not verified. Browser clients on separate localhost/127.0.0.1 origins have independent storage and seats. They are on one computer, not physical phones.

## Direction
Preserve BONES ivory/plum/coral/mint clay art and the parent Decadence Arcade's warm social-play identity, raised cabinet controls and bold hierarchy. Rounded system/Avenir typography works offline. Essential information stays on felt; instructions, settings and host operations stay in native dialogs. Reward cues are snapshot-driven; reduced motion retains outcomes without effects.

## Coverage checklist
| Screen/state | Evidence |
|---|---|
| Home, Wi-Fi/online selection, existing brand assets | Browser + Review |
| Create/auto-join, loading, name editing, invite | Browser |
| Explicit readiness/unready, host identity, occupancy | Browser + Automated |
| Room directory, full/playing/paused rooms, room switching | Browser + Automated |
| Rules, sound, optional vibration, menu dismissal | Browser; hardware vibration Pending |
| Placement, private hands, bid/pass, own-stack-first reveal | Browser + Automated |
| Safe reveal, skull/discard, points, result/next round | Browser + Automated |
| Victory, rematch, return to lobby, new guest | Browser + Automated |
| Eliminated spectator, choose-lead, host removal/transfer | Automated; conditional layout Review |
| Disconnect, saved-seat resume, host loss/migration | Browser + Automated |
| Invalid code/token, expired room, duplicate seat/join/start | Browser + Automated |
| Setup scroll/keyboard, focus, modal input isolation | Browser; native keyboard Pending |
| Install help, PWA cache update | Browser install help + Review; installed/offline PWA Pending |

## Networking contract
One computer runs `npm run lan`. Phones open the printed `http://<LAN-IP>:10000/Bones/` address (or bones.local where supported). Use Share Invite, a join link or the room code on the same host. Guests ready up; host starts with 3–6 connected seats. Bots are ready automatically. The room browser lists only rooms on that server, not nearby machines. Local hosting can operate without internet; public online tables require internet. Firewalls, guest isolation, different subnets and local-name resolution may prevent connections.

Lobby host departure transfers to a connected human. Active departure pauses; connected survivors vote to continue and transfer control. A missing revealer/skull owner may need to reconnect or be removed (removal ends the round, preserving scores). Reconnection retains private identity via saved seat token. Play Again keeps the group; Return to Lobby keeps seats and scores on display, resets readiness and accepts new guests; starting resets the match.

## Limits
Physical LAN devices, real router/firewall isolation, notch/browser chrome, native on-screen keyboard, physical haptics, installed PWA, real WAN/service restart and screen-reader usage are unverified. No claim of bug-free or physical-LAN readiness. Existing progression is fair two-point match mastery; no new unlock or streak system.

## Final verification
- 42 rule, bot, input, layout, discovery and WebSocket tests pass; production build passes. All 55 SVGs parse; changed files pass whitespace checks.
- Actual browser sizes: 390×844 host; 320×568 guest/full six-seat table; 844×390 scrolling landscape; 768×1024 tablet; 1280×900 desktop. These are viewport checks with pointer and keyboard input, not physical touch devices.
- Two independent browser origins completed a two-point match, readiness/unready, bid/pass, own/opponent flower reveals, victory and return to lobby. Six seats exercised maximum bid, skull, owner-only hidden discard, host departure, voting, migration and saved-seat reconnect.
- Final-build checks: shared pause/resume; native keyboard focus recovery and automatic scroll; sound toggle; host controls; leave/cancel/confirm; online setup; install help; invalid room; loading/disabled submission; expired-room recovery after restarting the ephemeral server. The stale table clears and a fresh room can be created.
- Protocol-heartbeat test disables a client’s automatic pong: the server closes the silent peer and migrates lobby hosting. Loopback invite uses the host IP; copy feedback succeeds.
- Browser warnings/errors: none in the checked home, guest-match and invalid-room tabs. No observed broken artwork. Formal frame-rate profiling and a screen-reader audit were not performed.
- Landscape retains a scrollable portrait board rather than shrinking six seats; this requires scrolling between the table and lower actions. Focused actions now scroll into view.

## Screenshot evidence
Artifacts in `output/interface-upgrade/`: `before-home.jpg`, `before-lobby.jpg`, `after-home.jpg`, `after-lobby.jpg`, `six-lobby-320.jpg`, `six-play-320.jpg`, `six-reveal-landscape.jpg`, `skull-landscape.jpg`, `tablet-reveal.jpg`, `desktop-reveal.jpg`, `victory.jpg`, `rooms.jpg`, `final-lan-invite.jpg`, `expired-room.jpg`. Before images capture the existing working tree at the start of this audit. Existing artwork and prior upgrades were preserved; the new changes focus on completing interaction and networking behavior.

## Router player-experience pass — 14 October 2026

### Changes and tap counts
- Warm configured LAN entry: one mode tap to reclaim/join/create. Internet creation: two taps before (Play Online → Create), one after (Play Online). Invite entry: opening the link plus zero in-game taps. Optional name edits remain in the lobby. Modern guest readiness is one deliberate consent tap; host Start is one tap.
- Manual online code joining lives in Menu; full/invalid-room setup offers Create My Own Room. Internet connection allows45 seconds with wake-up copy; LAN allows10 seconds. Startup failures no longer claim automatic reconnection without a saved seat. Accepted expiry errors survive later socket closure.
- BONES Home and Decadence Arcade are distinct. Active arcade exit has Stay/Leave, preserves the saved seat, and actual navigation to decadenceinc.com was verified. Home clears invite query routing.
- Native canvas actions respond on press, reject drags over10 px, ignore held-key repeat and expose pending disabled/busy states. Tap sound is no longer played by both native and canvas handlers. Celebrations end after1.8 seconds; result/rematch actions are immediately available.
- Updated server advertises capability flags; older online hosts keep basic play with unsupported controls hidden and compatible first-card/readiness guidance.

### Measured performance
Production build in the Codex in-app browser, six seats, steady Add phase,390×844, 240 recent draws per sample. Instrumentation is QA-only and includes canvas submission plus HUD work; it does not measure GPU frame time or certify phone FPS. Baseline:29 canvas layout reads/draw, median 0.9 ms / p95 1.7 ms. Final representative sample:3 reads/draw, median 0.8 ms / p95 1.6 ms. An intermediate sample varied to1.6 ms / p95 2.6 ms while multiple browser tabs were active; treat small timing differences as noisy, not a general speed guarantee. Cache display scale once per draw and bind native input handlers on control creation. No new assets or runtime dependencies. Profile JSON files are in output/player-experience/.

### Additional verification
-47 tests pass; final production build and diff checks pass. Existing modern rule/transport coverage includes completed matches, rematches, pause/votes, host migration, seat recovery, readiness, bots and private views.
- Latest native browser:320×568 LAN host,844×390 LAN guest, independent origins/identity hints, direct invite, explicit readiness, start, independent placements, maximum bid, safe/skull selection, Menu and parent exit/cancel. A 25 px drag inside a private card left the hand/stack/turn unchanged. Keyboard selection and confirmation work. Earlier390×844, tablet and desktop coverage above remains applicable; final rendering changes preserve their geometry.
- Real public internet backend (wss://bones-lfxr.onrender.com/ws): separate clients created/joined, completed a two-point match, rematched with three seats and reset scores, and verified direct bottom selection against a skull on top. Native browser clients created with one tap, joined by invitation, edited names, played/scored, and resumed a saved seat. The long native-browser match was interrupted when its room disappeared before its final reveal; it is not recorded as a completed browser internet match.
- Public passive host-departure check timed out waiting10 seconds for a state update after socket closure. This is a failed recovery scenario on the currently deployed older backend, not a passing modern-server test. An earlier room was confirmed missing by a fresh join request. Modern local backend tests pass; deploying it and provisioning durable storage remain required before claiming robust public recovery.
- Public health answered200/internet; one wake-up took 13.1 seconds, motivating the longer initial connection window. The public host does not yet advertise modern capabilities or expose ready/bot fields. No deployment was performed.

### Remaining limits
Physical-device Wi-Fi/router isolation, real on-screen keyboards/notches/haptics, installed PWA behavior, GPU/frame-rate profiling, and screen-reader certification remain unverified. Public-host migration/persistence needs the server update and another live recovery test.

Additional screenshots: output/player-experience/before-six-lobby.jpg, final-menu-320.jpg, internet-invite.jpg, internet-play-320.jpg, arcade-exit-confirm.jpg. Public protocol probe scripts are QA evidence, not CI tests.

Final input regression: feedback gates are scoped to reveal/loss/choose-lead. Old flip/discard timers cannot stall the next round, lobby or rematch. Native disabled state follows these gates and the connection handshake. A dedicated regression test covers this; the final suite of 47 tests passes. Local landscape skull-owner discard reached the round result with separate clients, with no browser warnings or errors.

Final setup checks: connection attempts disable editable fields and submission; failure restores them. Setup makes underlying canvas/navigation inert. Whitespace-only manual codes show a recovery message without creating a room. BONES Home removes invite routing, and reload remains home. Card strips allow scrolling and prevent native image dragging. Final targeted entry/input checks: 9 passed. Additional screenshots: final-connection-error.jpg, final-home-menu.jpg and final-lan-skull-landscape.jpg.

## Top-left Menu / lower actions follow-up
Menu moved top-left; stage headings reserve its width. Removed the 56px bottom dock reservation. Lobby Start/Ready and invite actions move toward the bottom; add-phase bids align low using their actual rendered height. Production build and whitespace checks passed. Browser verified six seats (host + five bots), lobby at 390×844, placement/add at 320×568, all six bid buttons fully visible, and saved-seat pause/continue after reload. Screenshot: output/player-experience/top-menu-six-play-320.jpg.

## Spacious player mats and iconography
Replaced compressed seat art with taller panels, row spacing, larger public stacks, separated identity/score/count lanes, YOU/host/bot markers, relevant-only state badges and one shared icon legend. Removed decorative shared-table frame; reveal panels retain seat columns and bottom/top labels. Accessible canvas summary includes card counts, bids and pass status; Rules explains icons. Verified six-seat 390×844 play/reveal, 320×568 mats and action accessibility, maximum bid via keyboard, native reveal selection/confirmation, no warnings/errors in checked tab. Four layout/input tests and production build passed. Short phones scroll rather than shrink the new board. Physical touch remains unverified. Screenshots: spacious-six-play-320.jpg, spacious-six-reveal.jpg.

## Thematic home refresh
Existing SVG cards compose a fanned hero with clay wordmark, soft shadow and mint/coral sparkles. Added brief ease-out arrival and gentle bob; reduced motion renders a still composition. Verified home at 390×844 and 320×568, including reduced-motion layout and install help. Narrow captions shortened to prevent truncation. Build/whitespace checks pass; no new assets/dependencies. Screenshot: output/player-experience/thematic-home.jpg.

## Flower victory celebration
Added bounded five-petal confetti, crown pop and playful winner/spectator copy. Checked six-seat winner 390×844, reduced-motion winner 320×568 and spectator layout. Rematch button immediately reset scores and kept six seats. Verification used an isolated preview server with a win generated through real rule actions; this is controlled UI QA, not a new live multiplayer match. No console warnings/errors in checked spectator tab. Production build and diff checks pass. Screenshot: output/player-experience/flower-victory.jpg.

## Winner-only rematch and seat management
Centered crown, heading/name/accomplishment; removed other-player score tiles and replaced Menu with direct Home. Capability-gated rematch-ready action is idempotent, counts all humans/bots, and starts only with all connected seats opted in. Already opted-in CTA is inactive with mint glow. Host Manage Seats preserves opt-ins as lobby readiness; empty slot opens Bot choice, occupied guest/bot has labelled × and explicit cancel/remove confirmation. Prevent stale confirmation from removing a reindexed player. Legacy servers retain host-controlled rematch until updated.
50 tests pass, including duplicate votes, unanimous consent, offline blocking and partial lobby readiness. Browser: controlled six-seat guest rematch count/inactive state; 320×568 winner-only layout; host Manage Seats; actual local server empty-seat Bot, removal cancel and confirmed removal. Fixed single-player mat overlap with empty slots; redundant Add Bot button removed. Build/diff checks pass. New rematch protocol needs updated-server deployment; physical touch/live public rematch remain unverified. Screenshots: winner-rematch-clean.jpg, seat-management.jpg.

Host flow refinement: clicking Rematch now immediately opens shared lobby/seat management and marks host ready. Earlier guest votes remain ready; host can change seats before explicit Start. Verified controlled browser Rematch→lobby and 25 rule tests, including host-only access, preserved votes and Start blocking unready guests; build/diff checks passed. This supersedes automatic-start guidance for the current host UI.

## Seat icons, session flowers and button feedback
Names align with avatars and reserve a separate top-right × lane. Removal icon has 44px minimum hit area and existing confirmation. Empty seats show + / OPEN SEAT with unique accessible labels. Server sessionWins increments for two-point and last-standing victories, survives rematches and is public as a lobby flower/count. Default zero preserves old rooms; new seats start fresh. Rules/accessible summaries explain the badge.
53 tests and production build passed, including two consecutive match-win accumulation, rematch preservation and elimination without round-point award. Browser verified six names/flower in controlled post-win lobby at 320×568, real local +→Bot, ×→confirmation/cancel, and menu focus. Button presses use brief eased visual feedback; reduced-motion disables movement. Physical touch and updated public-server deployment remain unverified. Screenshots: session-flower-seats.jpg, seat-icons.jpg.

Lobby header follow-up: LAN/table type and room code now share a row below Menu, with occupancy text underneath; removed the large middle room-code panel. Six-seat 320×568 screenshot checked for clearance and inactive Share Invite; two-seat local lobby retains actionable sharing. Production build/diff checks passed. Screenshot: lobby-header-room.jpg.

## Home identity and compact install
First-visit name dialog validates empty names, saves nickname locally, and home shows the name plus animated pencil. Tested fresh-origin save, reload without repeat prompt, edit and subsequent reload at 320×568. Small browser Install button and people/3–6 footer preserve hero art. Standalone/appinstalled visibility uses existing browser signals; actual installed-PWA launch/storage separation remains unverified. Added host lobby + bot shortcut; disabled at six seats. Screenshot: home-player-name.jpg.

## Real empty seats and removal repair
Replaced the user-facing controlled victory preview on port 10030 with the real authoritative LAN server; screenshot’s Mint/Coral/etc were test occupants, not empty seats. Real lobby now starts with actual host and five dashed EMPTY SEAT/+ mats. Removed header plus. Menu trigger and panel use cabinet ink/plum/coral treatment. Stable public IDs prevent confirmation snapshot updates/reindexing from cancelling or targeting the wrong person; server rejects mismatched ID.
Browser verified +→Bot, removal with an independent guest joining while confirmation is open, correct bot removal while preserving guest, then confirmed guest cleanup. Menu screenshot checked. 54 tests/build passed, including ID/reindex regression and stale-ID transport checks. Real public deployment/physical touch remain unverified. Screenshots: real-empty-seats.jpg, themed-menu.jpg.

## Centered gameplay headings and text motion
Gameplay heading/subtitle center below Menu at y84/113; player/reveal rows now begin at142. Canvas text eases in for280ms on phase/content changes, then rests; dialog headings/copy use matching entrance. Reduced motion suppresses movement. Controlled rule-generated previews verified six-seat Place a Card at320×568 and Round Complete at desktop size, with Next Round working. Four layout/input tests, production build and diff checks passed. Loss hero height is capped to preserve discard-action clearance. Screenshots: place-heading-centered.jpg, result-heading-centered.jpg.

## Bid card flip
Central 800ms eased card flip persists through immediate final-flower→result and skull→loss transitions, where the former small table flip vanished. Uses existing colour-matched backs and flower/skull faces; no gameplay timing change. Next-round actions remain usable and new phases cannot show stale flips. Reduced motion displays the face without rotation. Controlled rule-generated browser checks exercised flower/result, skull/loss, selection/confirmation and discard/result with no checked console warnings. Build and targeted input checks passed. Screenshot: flower-flip-opening.jpg.

## Automatic own reveals and visible points
Server-priority paced actions open the winning bidder’s own top cards (1.7s intro,1.3s between flips) then return opponent-card selection to the bidder. Any skull loss uses the existing shuffled discard with a random hidden outcome; no manual discard on updated hosts. Capability flag keeps older servers compatible. Warm gold-filled mats replace tiny point tokens in play/reveal.
57 tests/build pass, including automatic own-stack order/stopping and three independent WebSocket clients receiving the same flower/result and skull/random-discard/result without manual commands. Controlled browser screenshot verifies a one-point mat’s fill at320×568. User authorized immediate restart of the ephemeral local host; port10030 now runs the updated server and a fresh lobby was opened. Live public deployment remains pending. Screenshot: gold-point-mat.jpg.

## Reveal animation refinement
Removed central spotlight/dark takeover and announcement. Native table card rotates in place with720ms smooth easing, midpoint face swap and stable dimensions. A rendering-only950ms reveal presentation lets the final flip settle before result/loss layout appears; authoritative actions continue unchanged. Celebratory confetti waits until the flip settles. Browser checked final-flower selection/flip/result on an isolated rule-generated preview; build and four layout/input checks passed. User’s active room was not reloaded. Screenshot: in-place-flip.jpg.

Point/hand clarity: gold mats now show an explicit star + 1 POINT badge, including reveal mats, replacing ambiguity between point fill and turn outline. Hand guidance sits outside/above the tray in coral with wider space; short screens use slightly shorter cards to preserve action clearance. Six-seat320×568 point/hand preview inspected. Build/layout/input checks passed. Screenshot: point-badge-hand-guidance.jpg.

## Private played-card recall
Own stack is marked PEEK and tappable during place/add/bid/pause. Dialog shows only existing seat-private stack faces, labelled bottom/top, sends no action, and closes when cards/round change or revealing begins. Opponent stacks remain noninteractive for peeking. Controlled six-seat320×568 check showed flower bottom/skull top; dismissal preserved turn, stacks and score. Build/diff checks and30 rule/privacy tests passed. Screenshot: private-card-peek.jpg.

## Spacing pass after discarded-round screenshot
Expanded gameplay mats to104px with16px row gaps; results/paused mats112px. Identity, role/status, and card-count lanes are separated. Result views omit stale bid/pass pills, use an icon/message row in lower space, and place Next Round near the bottom. Short-screen table minimum increased modestly to preserve action clearance. Verified controlled six-seat discarded result at390×844, Next Round and three-card hand at320×568. Four layout/input checks, build and diff checks passed. Screenshot: spacious-round-result.jpg.

- Fluid width: verified 430px phone and 1440px desktop canvas fills viewport; isolated reveal card selection still exposes confirmation; no captured console errors. Build plus five layout/input tests pass. Physical-device check remains open.

Full fluid-width follow-up: see `docs/RESPONSIVE_AUDIT.md` for the page/popup matrix, fixes, screenshot locations and explicit evidence limits.
