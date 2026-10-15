# Fluid-width UI verification — 15 October 2026

Browser evidence uses the Codex in-app browser. Phone/desktop dimensions are viewport simulations, not physical devices. User's active server on port 10030 was not restarted or used for destructive testing.

## Screen coverage

| Screen/state | Verification |
| --- | --- |
| Home and saved name | 320×568 and 1440×900 screenshots; name editor save/empty validation |
| LAN setup | Narrow phone and desktop; expanded connection options; reachable buttons through scrolling/keyboard |
| Online create/join setup | Entry and join-code form reviewed; HTTP address validation checked. Follow-up: two independent browser clients joined the same public online lobby successfully; public completed-match transport was not retested |
| Connecting | Controlled server that accepts a socket without replying; busy fields/submit and recovery navigation inspected |
| Host unreachable | Unused local port; recovery form/message inspected on phone and desktop |
| Invalid/expired code | Actual isolated server; unknown code produces recovery text |
| Host lobby | Phone and desktop; empty seats, occupancy, share/start controls |
| Guest lobby | Phone; ready state and host-only controls omitted |
| Full/rematch lobby | Desktop; six occupied seats, inactive invite/start, host seat controls |
| First placement | Phone and desktop, six seats/four hand cards; final desktop card outline/avatar fix retested |
| Play or bid | Phone and desktop; additional tablet 768×1024 check |
| Bidding | Phone and desktop, both watching and active raise/pass controls |
| Reveal introduction | Phone and desktop; illustrated introduction observed |
| Reveal selection | Phone and desktop; two cards per seat, one-point mats; narrow point/bid overlap corrected and settled view retested |
| Skull/card loss | Phone and desktop; legacy manual discard layout. Modern automatic discard is covered by automated server tests |
| Eliminated player chooses lead | Phone and desktop; compacted choices after eliminated seats |
| Round result | Phone and desktop; point result and Next Round action layout |
| Victory | Host and guest phone/desktop views; winner name and rematch controls |
| Rematch | Guest vote counted once and became inactive; host Rematch opened shared seat-management lobby |
| Pause | Phone and desktop; actual local start → pause verified with bots |
| Connection lost | Actual isolated host stopped; reconnect notification and disabled game controls inspected. Removed redundant canvas reconnect banner |

Main six-player states use controlled presentation fixtures (`output/player-experience/all-pages-preview.mjs`). These are UI evidence, not proof of real multi-device synchronization. Actual server on port 10072 separately verified bot addition, confirmed removal, restored empty seats, Start and Pause. The full automated suite additionally exercises independent WebSocket clients, completed matches, reconnect/privacy, automatic reveals/discard and rematches.

## Popup coverage

- [x] Game menu: phone, desktop, short landscape; sound on/off retains focus; no removed Rooms/Arcade actions.
- [x] Name editor/onboarding component: phone/desktop; empty-name error, save, return.
- [x] Rules: phone/desktop; scroll, end action, close and Escape restore navigation.
- [x] Install help: phone/desktop; dismiss. Browser-owned installation prompt not exercised.
- [x] LAN host help: phone/desktop; readable host/IP/firewall requirements, dismiss.
- [x] Invite: phone/desktop; link field, copy success, return. Native Share sheet not exercised.
- [x] Host controls: phone/desktop/landscape; row controls, two-step removal label, scrolling and Done. Fixed sticky close overlapping scrolled rows.
- [x] Seat removal confirmation: phone/desktop; cancel and actual confirmed bot removal.
- [x] Leave-table confirmation: phone/desktop; cancel preserves table.
- [x] Private played-card peek: phone/desktop; correct private face and return.
- [x] Notifications: validation/connection errors and dismiss control; corrected vertical scale for desktop positioning.

The old room-browser and arcade-exit confirmation implementations are not reachable from current navigation, which intentionally omits those buttons; they were source-inspected, not represented as browser-tested popups.

## Fixes and regression evidence

Fixed desktop logo height, artwork transform/rotation distortion, SVG avatar clipping, stretched card outlines and their hit areas, count/people/empty-seat icon proportions, narrow reveal point/bid collision, empty lead-choice slot, duplicate reconnect banner, and overlapping landscape host close control. Rebuilt after changes and retested affected views. Full automated suite: **58 passed**. Final production build and whitespace check passed. Stable fixture page reported no captured console errors; failed-host tests intentionally produce connection errors.

Screenshots: `output/player-experience/audit-*.jpg`. Representative final files: `audit-place-final-1440.jpg`, `audit-reveal-final-320.jpg`, `audit-home-1440.jpg`, `audit-add-tablet-768.jpg`. Screenshots taken during introductions are named separately from settled views where applicable.

## Limits

Short landscape and small phone screens scroll vertically; the board has not been redesigned into a landscape-specific seat arrangement. Not verified here: physical touch, virtual keyboard/browser chrome/safe areas, installed PWA lifecycle, native install/share sheets, audio through actual speakers, physical LAN devices/router, production deployment or every browser engine. No claim that the game is bug-free or production LAN-ready follows from this pass.

Online entry follow-up: home Play Online now keeps room-code entry open; Create My Own Room is a separate explicit action. Browser verified joining public room W7XHXX as a second client, with matching host/guest player lists. Shared automatic-entry path hides transient setup forms, exposes Connecting and supports menu cancellation. Entry/layout tests and build passed.
