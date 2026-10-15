The matte BONES wordmark defines the visual language: warm ivory, deep plum, coral and mint, with soft clay-like depth instead of metallic trim or shine. Keep phase text and legal actions legible above decoration. Menu, setup, HUD panels, buttons, discs, player mats, score badge, crown and PWA icon share these colors; six matte card-back colors still identify players. Use wide rounded shapes, one quiet edge line, shallow offset shadows, and restrained ambient motion. Hover lifts, press compresses, card/score events pulse, and reduced-motion keeps layout static. Long help lives in an illustrated DOM rulebook accessible from menu and table. Web Audio synthesizes short clacks, bid boings, reveal rattles and reward notes after interaction; a persistent sound toggle lets players mute it. On 320px and 390px phones, favor contrast and visible touch targets over extra decoration.
Menu choices use Wi-Fi/globe artwork with their descriptions inside the tap target. DOM setup uses the same SVG button art as canvas controls and keeps helper links secondary to create/join. Reveal choices are player-colored face-down stacks: mint outlines mark legal choices, dimmed stacks explain the own-stack requirement, and the summary retains opened faces. Bid amount and confirmation share one panel. Six-player mats compact further below 640 logical canvas units; name, score and stack art must occupy separate rows. Forms scroll on short screens.

Entry is action-first: Play on Wi-Fi automatically reclaims a saved seat or joins/creates a room on the connected LAN host; Play Online creates a room, and invite links join directly. Names are optional at entry and editable by tapping the player’s lobby mat. Address and manual code inputs live behind disclosures. A live room browser marks the current room, shows waiting/playing/paused/finished status, occupancy and six seat dots, and keeps Create Another Room above the list. Browsing does not leave a game; switching an active room explains that the round ends and points stay. Host removal uses explicit confirmation. Use card terminology and Safe Flower/Skull Trap labels; teach the two-point goal on the menu and celebrate the crown with score and match summary.

Card gameplay: visible colored played cards live on named table areas. Selection stays inline, highlights before confirmation, and flips in place for all clients; no stack picker dialog. Own-stack-first remains. Arcade cabinet navigation uses mint outlined controls and status lamps, inspired by Colorosse Coinop panels (https://colorosse.com/assets/2d/ui/coinop-panel-ui-kit); artwork is original. Shared search, safe/skull, discard and point feedback precede the two-point podium/rematch.

Playtest upgrades: preserve card touch targets at 48×60 physical pixels; horizontal strips stay inside each table and label bottom/top. Selection and confirm are native keyboard controls. Keep DOM focus while redrawing; hide cards during the search announcement. Reduced-motion rendering must continue through timed feedback expiry, then stop.

Navigation: one compact bottom Menu pill, with an18px outline menu icon and muted label. Sound, Rules, Rooms, Host and Home are disclosed in a themed native dialog. Reserve56px plus bottom safe-area space; the44px Menu target remains fixed while the table scrolls. Top shows only phase/turn text.

Shared-table refinement: one felt/wood illustration unifies seats and reveals, with colored seat markers and centered stacks. Navigation captions are 14 logical pixels; hand cards are 104/116 pixels tall. Played cards scale by available row height with at least 56×64 physical targets; full stacks scroll. Gold YOUR MOVE/READY prompts and a single reveal confirmation establish hierarchy. Hide decorative footer branding during active phases to preserve clearance.

Arcade feedback: compare authoritative snapshots so turn, bid, flower/skull and point cues fire once. Preserve the playfield: bid announcements occupy the existing spotlight. Two round score sockets receive flower badges; winner-colored cards frame the crown. Happy/sad original flower mascots support safe and skull events. Vibration is opt-in, persisted, and available through Rules for all players; unavailable devices disable it. Reduced motion removes score flight/confetti but retains clear static outcomes. Room tiles use party-ticket edges and six seat lights.

Audit fixes: canvas text truncates with ellipsis at a minimum12px physical size; names on felt are ivory, with identity colours on markers/cards. Canvas buttons retain44px physical height. Short landscape uses a scrollable full-height table rather than compressed rows; fixed native controls track the canvas on scroll. Body reserves all device safe-area insets; minimum canvas height also permits scrolling when safe areas reduce usable portrait height. Rules vibration shares SVG controls; room primary variants override dialog defaults. Host close remains visible/sticky; vibration settings live in Rules.

Bottom-dock layout frees the former80-unit header area for gameplay; placement and reveal start near65units. Minimum canvas height is reduced accordingly; fixed overlays still follow scrolling and respect reserved Menu space.

Player board: six colored smiling-avatar mats use separate name, played-count and bid/pass rows. Current leader has a gold bid chip; owned-card count stays at the right. Reveal headers retain avatars, played count and bid/hidden count above direct card targets. Private hand rests in its own illustrated tray. Play flights stay facedown, flips lift before showing Safe/Skull, and discarded cards fall into an illustrated chute. Reduced motion retains static feedback; minimum canvas height is 1.5 times width for comfortable seat clearance.

Party completion: guests explicitly ready up; Start is host consent. Ivory text states distinguish connected, ready and offline. Return to Lobby keeps identities/scores while clearing played cards/bids and readiness. Share uses the host’s private address when opened on loopback. Native canvas controls support taps and keyboard activation; focus follows changing actions and scrolls fixed overlays into view. Pause is a shared table action, resumed by connected survivors’ votes. Connection/setup has disabled busy states, ten-second handshake timeout, socket-scoped retries and expired-seat recovery. Protocol heartbeat detects silent link loss. Parent arcade identity is named on entry; existing BONES clay palette/art remains authoritative.

Router experience pass: one-tap online creation and direct invites, with manual-code entry in Menu. Collection navigation says Decadence Arcade; BONES Home is distinct and clears invite routing. Keep connection wake-up text quiet/mint and actionable expiry/full-room recovery visible. Pending moves show Sending Your Move and expose disabled controls. Native card drags do not activate; tap sound fires once, pressed art responds immediately, and held Enter/Space is one decision. Confetti lasts 1.8 seconds; result/rematch buttons can skip it immediately. Legacy-host capabilities remove unsupported controls and adapt turn/readiness guidance. Internet invites from local previews point to the public host.

Menu stays at the cabinet’s top-left, safe-area inset, beside the narrowed stage heading. No bottom navigation reservation. Lobby Start/Ready and gameplay bid controls sit low; bid placement measures rendered height so two touch rows remain visible on narrow phones. Six-seat table and private hand retain their geometry.

Player mats: 96 logical units high with 12-unit row gaps; identity, role, two score tokens and public card area have separate lanes. Coloured card stacks count played cards; outlined paired-card icon counts cards left. One shared legend plus Rules and accessible summaries explain icons. Gold TURN/bid/pass/offline badges replace repeated waiting text. Your seat/hand share a colour; retain seat order. Reveal panels expand in the same columns with bottom/top labels. Minimum board height preserves readability on short phones with modest scrolling.

Home: original clay BONES wordmark over a three-card flower/skull/back fan, a soft table shadow and restrained mint/coral sparkles. Ease-out entrance settles in 650ms; slow 3-unit bob and tiny sparkle breathing only when reduced motion is off. Decorative art never shifts action hit areas. Phone captions stay short; existing LAN/internet entry remains unchanged.

Victory: crown uses a 700ms ease-out-back entrance, followed by 3.6 seconds of rotating five-petal flower confetti in seat colours with golden centres. Flowers fade and stay above rematch controls. Reduced motion uses static crown art and no particles. Winner and spectator copy celebrate the champion; group scores and replay/lobby actions remain visible and immediately usable.

Victory is winner-only: centered crown, winner name and brief accomplishment, direct Home navigation, glowing Rematch CTA with live opt-in count. After opting in the button is inactive. Host Manage Seats opens lobby; empty seat → Bot and occupied seat × → confirmation. Keep kick targets accessible and separate from identity/score lanes.

Victory heading gets its own centered row below Home navigation; never reuse the right-offset gameplay header. Preview identities use neutral player names.

Host Rematch routes immediately to the shared lobby/seat-management screen, preserving prior opt-ins. Explicit Start lets the host adjust the group before dealing again. Guests keep the opt-in button.

Seat management uses a small top-right × with a 44px minimum hit area; name width reserves its space. Empty mats use a centered + and OPEN SEAT caption. Lobby flower badges track complete match wins in the room session; multiple wins add a count. Button presses ease briefly and native hover/press styling respects reduced motion.

Lobby header occupies a separate row below navigation: table type left, room code right, occupancy beneath. Seats start below that text; readiness and primary actions remain near the bottom. Share Invite is inactive at six seats and returns when capacity opens.

Home identity: first visit opens the existing accessible name dialog; nickname persists in origin-local storage and pencil editing updates home immediately. Header pencil wiggles gently with reduced-motion fallback. Browser footer has a compact Install button plus people icon/3–6; standalone/appinstalled hides Install. Lobby header adds a visible + bot shortcut, dimmed at capacity, in addition to empty-seat + controls.

Install lives in the home Menu, never the home footer; installed/standalone mode hides the menu item.

Empty seats are dashed mats with a centered + and EMPTY SEAT caption, visible to guests too; only occupied guest/bot seats have ×. No redundant header +. Disconnected players remain explicitly OFFLINE / RESERVED rather than appearing vacant. Menu trigger uses cabinet ink-button art; menu panel shares plum/coral surfaces and BONES typography. Confirmed removal resolves stable public player ID against current state, never snapshot-object equality.

Menu trigger is plain text: no button art, border, shadow or hamburger. Retain invisible 44px tap area and focus outline; gentle text breathing respects reduced motion.

Host empty seats say Add bot under + and add immediately, without a chooser dialog. Guest empty seats remain noninteractive. Menu text uses medium-weight rounded page typography, aligned with the table’s left margin.

Menu Sound/Rules are a two-icon row using existing illustrated assets, accessible names and sound pressed state. Sound toggles in place. Rooms and Decadence Arcade actions are omitted from Menu.

Menu label uses uppercase bold system typography matching canvas headings, modest tracking and table-aligned left inset. No idle breathing; movement is limited to hover/press feedback.

Gameplay heading/subtitle center below Menu (84/113 logical y); player/reveal mats start at 142. Canvas text gets a brief 280ms eased fade/rise only when phase/content changes, with no continuous wobble and no hit-area movement. Reduced motion keeps text still.

Every confirmed reveal gets a central 800ms card flip: colour-matched back narrows to an edge, then opens to flower/skull. It survives immediate result/loss transitions; next-round controls remain below the visual overlay. Reduced motion shows the face without rotation.

Point reward: warm gold fill/border on player mats replaces the two small point tokens; reveal mats use the same fill. Server-paced automatic own-stack top flips and random skull discard remove needless taps, with capability-aware legacy fallback. Opponent reveals remain a player choice.

Reveal refinement supersedes central spotlight: flip the actual table card in place with 720ms eased rotation, stable dimensions and a midpoint face swap. Final flower/skull retains its last table position briefly across phase transitions and fades away. No dark takeover or large announcement.

Final transition timing: retain the reveal-table presentation for 950ms, allowing the 720ms in-place flip to settle before results/loss replace it. This is rendering-only; authoritative state continues normally. No floating card over a rearranged board.

Reveal presentation now holds for1450ms after the confirmed flip (500ms longer), before results/loss.

Gold-filled mats include an explicit star / 1 POINT badge. Turn/bid status sits separately below that badge; the turn outline alone does not imply a point. Hand instruction sits above the tray in coral, with wider text space and clear separation from cards.

Own played stack is tappable during placement/add/bid/pause, marked PEEK. Private dialog shows bottom-to-top faces from the existing seat-private snapshot; it sends no game action and closes if that stack/round changes. Opponent faces remain hidden.

Player mats separate identity, role/status and card counts into rows at24/50/85 logical y, with104px minimum height and16px row gaps; results use112px mats. Completed rounds omit obsolete PASSED/BID cues. Result icon/copy share a roomy horizontal row, with Next Round near the bottom.

Earned-point sound is a bright C-major ascending fanfare, resolving into a soft major chord with a quiet high sparkle; under one second, lower individual gains to avoid harsh stacked tones. Full-match victory remains distinct.

No legend row between mats and hand. Cards-left icon key lives unobtrusively at the header’s top right; hand content moves14 logical pixels up into the reclaimed space.

Reveal mats separate identity, point/revealer status and card strips with clear vertical spacing. Omit redundant hidden/card totals; preserve bottom/top order on cards. Show the confirmation button only after selection, with one progress line and one contextual instruction.

Fluid viewport: canvas uses all safe-area width. Wide-screen panel coordinates expand horizontally while text and card artwork retain vertical-scale proportions. DOM controls use independent horizontal/vertical geometry; preserve this mapping when adding controls. Short viewports scroll rather than clip.

Responsive audit: draw SVG avatar regions through clipping, rather than source-cropping under unequal scales. Normalize decorative artwork transforms while retaining card flips. Card outlines/hit targets follow the visible card, not its expanded desktop slot. Host popup close scrolls with the header; Done remains at the bottom. Avoid duplicate reconnect banners.

Automatic entry keeps the home screen visible with a Connecting cue; hide the setup shell until input/recovery is required. Keep explicit join-code entry visible. Menu cancellation closes the pending socket and returns home.

Play Online opens explicit room-code entry with a separate Create My Own Room action. Only invitations and an explicit create command connect automatically; pressing the home Online tile must never create a room.
