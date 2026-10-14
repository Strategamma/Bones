import test from 'node:test';
import assert from 'node:assert/strict';
import {releasedTap} from '../input.js';
test('touch release accepts a deliberate tap and rejects a drag, cancellation or different pointer',()=>{
 assert.equal(releasedTap({pointerId:1,x:10,y:10},{pointerId:1,x:14,y:13}),true);
 assert.equal(releasedTap({pointerId:1,x:10,y:10},{pointerId:1,x:40,y:10}),false);
 assert.equal(releasedTap(null,{pointerId:1,x:10,y:10}),false);
 assert.equal(releasedTap({pointerId:1,x:10,y:10},{pointerId:2,x:10,y:10}),false);
});

test('feedback gates only its current phase and never stalls a new round or rematch',async()=>{
 const {feedbackBlocksInput}=await import('../input.js');
 const justFlipped={flipAge:.1,phaseAge:.1,discardAge:.1};
 for(const stage of ['lobby','place','add','bid','result','win'])assert.equal(feedbackBlocksInput({stage,flips:[{}],discarded:{}},justFlipped),false,stage);
 assert.equal(feedbackBlocksInput({stage:'loss'},justFlipped),true);
 assert.equal(feedbackBlocksInput({stage:'reveal',flips:[]},justFlipped),true);
 assert.equal(feedbackBlocksInput({stage:'reveal',flips:[{}]},{...justFlipped,flipAge:2}),false);
 assert.equal(feedbackBlocksInput({stage:'choose-lead',discarded:{}},justFlipped),true);
 assert.equal(feedbackBlocksInput({stage:'choose-lead',discarded:null},justFlipped),false);
});
