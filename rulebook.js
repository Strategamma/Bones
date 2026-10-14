import {hapticsEnabled,toggleHaptics} from './haptics.js';
const base = import.meta.env.BASE_URL;
const rulebook = document.createElement('dialog');
rulebook.id = 'rulebook';
rulebook.setAttribute('aria-labelledby', 'rulebook-title');
rulebook.innerHTML = `
  <div class="rulebook-head">
    <span class="rulebook-eyebrow">THE QUICK RULES</span>
    <button type="button" class="rulebook-close" aria-label="Close rulebook">×</button>
    <h2 id="rulebook-title">Bluff. Bid. Reveal.</h2>
    <p>Find enough flowers to earn a point. Two points win. A skull stops your bid.</p>
  </div>
  <div class="rulebook-body">
    <section class="rule-step">
      <div class="rule-art two-cards"><img src="${base}assets/card-flower-new.svg" alt="Flower card"><img src="${base}assets/card-skull-new.svg" alt="Skull card"></div>
      <div><span class="rule-number">01 · YOUR HAND</span><h3>Three flowers. One skull.</h3><p>Only you can see your cards. Place one face down to start each round. On each player mat, coloured card backs show the played stack; the outlined card icon counts cards left. A gold-filled player mat and star badge mark a point won. A flower on a lobby seat marks a match won in this room session; a number beside it counts multiple wins. YOU marks your seat; a gold TURN badge shows who acts next.</p></div>
    </section>
    <section class="rule-step">
      <div class="rule-art"><img src="${base}assets/card-back-new.svg" alt="Face-down card"></div>
      <div><span class="rule-number">02 · YOUR CHOICE</span><h3>Place or bid.</h3><p>Everyone places one card to start. Watch your turn cue; the starter goes next, then play moves clockwise. Tap a hand card to add it on top, or tap a number to bid. The first bid locks the stacks: no more cards can be added.</p></div>
    </section>
    <section class="rule-step">
      <div class="rule-art rule-bid" aria-hidden="true"><span>1</span><b>→</b><span>2</span><b>→</b><span>3</span></div>
      <div><span class="rule-number">03 · THE BLUFF</span><h3>How many flowers?</h3><p>Bid no higher than the total cards on the table. Other players raise or pass. The highest bidder’s own stack opens automatically from the top, then they choose other cards. Tap a face-down card on the table to highlight it, then confirm to reveal it to everyone.</p></div>
    </section>
    <section class="rule-step">
      <div class="rule-art"><img src="${base}assets/point-badge.svg" alt="One-point badge"></div>
      <div><span class="rule-number">04 · THE REVEAL</span><h3>Two wins take the game.</h3><p>Reveal enough flowers to earn a point. Reveal a skull and the game randomly discards one of your hidden cards. Win a second challenge—or be the last player standing—to take the crown.</p></div>
    </section>
    <p class="rule-note rule-lobby-note">3–6 players · one private hand per phone. Guests tap I’M READY; the host starts.</p>
    <p class="rule-note">Wi-Fi play needs a computer running the BONES host. Open its printed local address on every phone. Same Wi-Fi alone is not enough: guest isolation and firewalls may block access. Internet tables need internet; the local host does not.</p>
    <p class="rule-note">If the host disconnects in the lobby, another connected human takes over. During play, the table pauses; connected surviving players vote to continue and transfer hosting. A needed revealer must return or be removed. Rematches keep everyone’s seat.</p>
  </div>
  <button type="button" class="rulebook-done">GOT IT — LET’S PLAY</button>`;
const tactile=document.createElement('button');tactile.className='haptics-toggle';tactile.textContent=hapticsEnabled()?'VIBRATION ON':'VIBRATION OFF';tactile.disabled=typeof navigator.vibrate!=='function';if(tactile.disabled)tactile.textContent='VIBRATION UNAVAILABLE ON THIS DEVICE';tactile.setAttribute('aria-pressed',String(hapticsEnabled()));tactile.onclick=()=>{toggleHaptics();tactile.setAttribute('aria-pressed',String(hapticsEnabled()));tactile.textContent=hapticsEnabled()?'VIBRATION ON':'VIBRATION OFF'};rulebook.querySelector('.rulebook-body').append(tactile);
document.body.append(rulebook);
rulebook.querySelector('.rulebook-close').addEventListener('click', () => rulebook.close());
rulebook.querySelector('.rulebook-done').addEventListener('click', () => rulebook.close());
rulebook.addEventListener('click', event => { if (event.target === rulebook) rulebook.close(); });

export function showRulebook(capabilities) {
  rulebook.querySelector('.rule-lobby-note').textContent = capabilities?.readiness===false ? '3–6 players · one private hand per phone. On this table, the host starts when everyone is connected.' : '3–6 players · one private hand per phone. Guests tap I’M READY; the host starts.';
  if (!rulebook.open) rulebook.showModal();
}
