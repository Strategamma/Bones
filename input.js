export function releasedTap(start,end){return !!start&&start.pointerId===end.pointerId&&Math.hypot(end.x-start.x,end.y-start.y)<=10;}

export function feedbackBlocksInput(state,{flipAge,phaseAge,discardAge}) {
 if(!state)return false;
 if(state.stage==='reveal')return state.flips.length ? flipAge<1.25 : phaseAge<1.5;
 if(state.stage==='loss')return flipAge<1.25;
 if(state.stage==='choose-lead')return !!state.discarded&&discardAge<1.2;
 return false;
}
