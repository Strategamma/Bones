// Compare authoritative snapshots, never animation frames, to trigger cues once.
export function arcadeEvents(previous, current) {
 if (!previous || !current || previous.code!==current.code) return {};
 const flip=current.flips?.length>previous.flips?.length?current.flips.at(-1):null;
 const active=['place','add','bid','reveal','loss','choose-lead'];
 const needsMove=current.stage==='place'?current.stack.length===0:current.stage==='loss'?current.skullOwner===current.seat:current.turn===current.seat;
 const previousMove=previous.stage==='place'?previous.stack.length===0:previous.stage==='loss'?previous.skullOwner===previous.seat:previous.turn===previous.seat;
 return {turn:active.includes(current.stage)&&needsMove&&(!previousMove||previous.stage!==current.stage||previous.round!==current.round),safe:flip?.disc==='flower',skull:flip?.disc==='skull',bid:current.bid>previous.bid,point:current.seats.some((p,i)=>p.wins>(previous.seats[i]?.wins??p.wins))};
}
