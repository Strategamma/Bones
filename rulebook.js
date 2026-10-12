const base = import.meta.env.BASE_URL;
const rulebook = document.createElement('dialog');
rulebook.id = 'rulebook';
rulebook.setAttribute('aria-labelledby', 'rulebook-title');
rulebook.innerHTML = `
  <div class="rulebook-head">
    <span class="rulebook-eyebrow">THE QUICK RULES</span>
    <button type="button" class="rulebook-close" aria-label="Close rulebook">×</button>
    <h2 id="rulebook-title">Bluff. Bid. Reveal.</h2>
    <p>Be the first to win two flower challenges. A skull can end a brave bid in one flip.</p>
  </div>
  <div class="rulebook-body">
    <section class="rule-step">
      <div class="rule-art two-cards"><img src="${base}assets/card-flower.svg" alt="Flower disc"><img src="${base}assets/card-skull.svg" alt="Skull disc"></div>
      <div><span class="rule-number">01 · YOUR HAND</span><h3>Three flowers. One skull.</h3><p>Only you can see your discs. Place one face down to start each round.</p></div>
    </section>
    <section class="rule-step">
      <div class="rule-art"><img src="${base}assets/card-back.svg" alt="Face-down disc"></div>
      <div><span class="rule-number">02 · YOUR CHOICE</span><h3>Place or bid.</h3><p>After everyone places once, take turns adding a flower or skull—or start a bid. The first bid locks the stacks: no more discs can be added.</p></div>
    </section>
    <section class="rule-step">
      <div class="rule-art rule-bid" aria-hidden="true"><span>1</span><b>→</b><span>2</span><b>→</b><span>3</span></div>
      <div><span class="rule-number">03 · THE BLUFF</span><h3>How many flowers?</h3><p>Bid no higher than the total discs on the table. Other players raise or pass. The highest bidder flips their own stack first, then chooses other stacks.</p></div>
    </section>
    <section class="rule-step">
      <div class="rule-art"><img src="${base}assets/point-badge.svg" alt="One-point badge"></div>
      <div><span class="rule-number">04 · THE REVEAL</span><h3>Two wins take the game.</h3><p>Reveal enough flowers to earn a point. Reveal a skull and lose one hidden disc. Win a second challenge—or be the last player standing—to take the crown.</p></div>
    </section>
    <p class="rule-note">3–6 players · one phone each · LAN on the same Wi‑Fi or an internet table</p>
  </div>
  <button type="button" class="rulebook-done">GOT IT — LET’S PLAY</button>`;
document.body.append(rulebook);
rulebook.querySelector('.rulebook-close').addEventListener('click', () => rulebook.close());
rulebook.querySelector('.rulebook-done').addEventListener('click', () => rulebook.close());
rulebook.addEventListener('click', event => { if (event.target === rulebook) rulebook.close(); });

export function showRulebook() {
  if (!rulebook.open) rulebook.showModal();
}
