// Strategy uses only the same private view supplied to a human player.
export function botAction(s, random = Math.random) {
  const me = s.seats[s.seat];
  if (!me?.connected || !me.discs && s.stage !== 'choose-lead') return null;
  if (s.stage === 'paused') return s.votes[s.seat] ? null : { type: 'continue' };
  if (s.stage === 'place' && s.stack.length || !['place', 'loss', 'choose-lead'].includes(s.stage) && s.turn !== s.seat) return null;
  if (s.stage === 'place' || s.stage === 'add') {
    const flowers = s.hand.filter(c => c === 'flower').length;
    const ownSafe = !s.stack.includes('skull');
    if (s.stage === 'add' && ownSafe && (s.stack.length >= 2 || !s.hand.length || random() < .4)) return { type: 'bid', amount: Math.max(1, s.stack.length) };
    if (s.hand.length) return { type: 'place', disc: flowers && random() > .22 ? 'flower' : s.hand.includes('skull') ? 'skull' : 'flower' };
    return { type: 'bid', amount: 1 }; // Bluff when forced to open the auction.
  }
  if (s.stage === 'bid') {
    const amount = s.bid + 1;
    let chance = s.stack.includes('skull') ? 0 : 1;
    // Larger stacks are likelier to contain flowers; a one-card stack may be a trap.
    const odds = s.seats.filter((p, i) => i !== s.seat && p.stack).flatMap(p => Array(p.stack).fill(p.discs === 1 ? .7 : p.stack > 1 ? .8 : .65)).sort((a,b) => b-a);
    for (let i = 0; i < Math.max(0, amount - s.stack.length); i++) chance *= odds[i] || 0;
    const threshold = me.wins === 1 ? .4 : .5;
    return amount <= s.total && (chance >= threshold || random() < .06) ? { type: 'bid', amount } : { type: 'pass' };
  }
  if (s.stage === 'reveal') {
    const options = s.seats.map((p, owner) => ({owner, indices:Array.from({length:p.stack},(_,i)=>i).filter(index=>!s.flips.some(f=>f.owner===owner && f.index===index)), size:p.stack})).filter(p=>p.indices.length);
    const own = options.find(p=>p.owner===s.seat);
    const target = own || options.sort((a,b)=>b.size-a.size || a.owner-b.owner)[0];
    if (target) return {type:'flip', target:target.owner, index:own ? target.indices.find(i=>s.stack[i]==='flower') ?? target.indices[0] : target.indices.at(-1)};
  }
  if (s.stage === 'loss' && s.skullOwner === s.seat) return {type:'discard', index:Math.floor(random()*s.lossCount)};
  if (s.stage === 'choose-lead' && s.challenger === s.seat) return {type:'lead', target:s.seats.findIndex(p=>p.connected && p.discs)};
  return null;
}
