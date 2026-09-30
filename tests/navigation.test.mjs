import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {checklistKeys} from '../feedback.mjs';
function app(fetchImpl){
 const elements=new Map();const el=s=>{if(!elements.has(s))elements.set(s,{innerHTML:'',dataset:{},addEventListener(type,fn){this[type]=fn},setAttribute(){},remove(){},focus(){this.focused=true}});return elements.get(s)};
 const ctx={document:{querySelector:el,querySelectorAll:()=>[],documentElement:{}},window:{},location:{protocol:'http:'},clearTimeout(){},setTimeout(){},AbortSignal,fetch:fetchImpl};vm.createContext(ctx);
 const source=readFileSync(new URL('../index.html',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1].replace('  render();\n})();','  globalThis.test={state,intervals,requestFeedback,compactGraphScale,feedbackProgress};render();\n})();');vm.runInContext(source,ctx);
 const {state,intervals,requestFeedback,compactGraphScale,feedbackProgress}=ctx.test;
 const click=(action,index=0,extra={})=>el('#app').click({target:{closest:()=>({dataset:{action,index:String(index),...extra}})}});
 const input=(field,index,value)=>el('#app').input({target:{dataset:{field,index:String(index)},value}});
 const hide=(index,reason)=>{click('flag-outlier',index);input('dialogReason',0,reason);click('hide-bar')};
 const write=value=>el('#app').input({target:{id:'explanation',value}});
 state.welcomed=true;click('demo');click('calc');intervals().forEach((r,i)=>input('answer',i,Number(r.v).toPrecision(2)));click('check-calc');click('graph');intervals().forEach((r,i)=>input('height',i,Number(r.v).toPrecision(2)));click('check-graph');
 return {state,click,input,hide,write,el,requestFeedback,compactGraphScale,feedbackProgress,ctx};
}
const feedback={strength:'You described the change.',checklist:Object.fromEntries(checklistKeys.map(key=>[key,{status:key==='anomalies'?'no_anomaly':'clear',comment:'A short observation.'}])),nextStep:'Check your units.',question:'What do equal bars tell you?'};
test('navigation preserves graph, explanation, feedback and escapes student/AI text',async()=>{
 let payload;
 const a=app(async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({feedback:{...feedback,strength:'<script>alert(1)</script>'}})}});
 a.click('explain');a.write('The velocity increases. <img src=x onerror=alert(1)>');await a.requestFeedback();
 assert(!Object.hasOwn(payload,'name'));assert.equal(payload.rows.length,8);assert.equal(payload.language,'en');
 const snapshot=JSON.stringify(a.state);a.click('back-graph');a.click('back-calc');a.click('back');a.click('calc');a.click('graph');a.click('explain');assert.equal(JSON.stringify(a.state),snapshot);
 assert(a.el('#app').innerHTML.includes('&lt;img'));assert(a.el('#app').innerHTML.includes('&lt;script&gt;'));assert(!a.el('#app').innerHTML.includes('<script>'));
 a.write('I revised my explanation with scientific evidence.');assert.equal(a.el('#feedback-stale').hidden,false);
 a.el('#language').click();assert(a.el('#app').innerHTML.includes('Explica tu gráfica'));
 a.click('back-graph');a.click('restart');assert.equal(a.state.explanation,'');assert.equal(a.state.feedback,null);
});
test('unavailable feedback keeps writing; validation prevents API calls',async()=>{
 let calls=0;const a=app(async()=>{calls++;throw Error('offline')});a.click('explain');a.write('Hi');await a.requestFeedback();assert.equal(calls,0);assert.equal(a.state.feedbackError,'shortWriting');
 a.write('The highest bar shows the greatest average velocity.');await a.requestFeedback();assert.equal(calls,1);assert.equal(a.state.feedbackError,'unavailable');assert.match(a.state.explanation,/highest bar/);assert.equal(a.state.feedbackBusy,false);
 a.input('height',0,'');await a.requestFeedback();assert.equal(calls,1);assert.equal(a.state.feedbackError,'graphFirst');
});
test('a correct visible graph can request feedback without a separate check click',async()=>{
 let calls=0;const a=app(async()=>{calls++;return {ok:true,json:async()=>({feedback})};});
 a.state.barChecked.fill(false);delete a.state.scale;
 a.click('explain');a.write('The average velocity increased across the intervals shown in the graph.');await a.requestFeedback();
 assert.equal(calls,1);assert.equal(a.state.feedbackError,'');
});
test('late response does not overwrite a new run; concurrent clicks send once',async()=>{
 let resolve,calls=0;const a=app(()=>{calls++;return new Promise(r=>resolve=r)});a.click('explain');a.write('The runner moves faster in the later intervals.');const pending=a.requestFeedback();await a.requestFeedback();assert.equal(calls,1);
 a.click('back-graph');a.click('restart');resolve({ok:true,json:async()=>({feedback})});await pending;assert.equal(a.state.feedback,null);assert.equal(a.state.explanation,'');
});
test('measurements invalidate checks without erasing previous answers and bars',()=>{
 const a=app();const answer=a.state.answers[0],height=a.state.heights[0];a.click('back-calc');a.click('back');a.input('x',1,'3.1');a.click('calc');assert.equal(a.state.calcChecked[0],false);assert.equal(a.state.calcChecked[1],false);assert.equal(a.state.calcChecked[2],true);assert.equal(a.state.answers[0],answer);assert.equal(a.state.heights[0],height);
});
test('compact graph keeps the intervals but uses its own readable scale',()=>{
 const a=app();a.state.scale=15;a.click('graph');const source=a.el('#app').innerHTML;
 const bars=html=>[...html.matchAll(/id="bar-(\d+)"/g)].map(m=>m[1]);
 a.click('explain');const preview=a.el('#app').innerHTML;
 assert.deepEqual(bars(preview),bars(source));assert(preview.includes('height:338px'));
 assert([...preview.matchAll(/<div class="ylabels">(.*?)<\/div>/g)][0][1].match(/<span/g).length<=7);
 assert(!preview.includes('role="slider"'));assert(!preview.includes('data-field="height"'));
 assert(preview.includes('Check unusual results'));assert(preview.includes('Use scientific words'));
 assert(source.includes('During which visible section was the runner fastest?'));
});
test('student can hide several velocity bars while keeping at least three visible',async()=>{
 let payload;const a=app(async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({feedback})};});
 a.click('flag-outlier',1);assert(a.el('#app').innerHTML.includes('role="dialog"'));assert(a.el('#app').innerHTML.includes('Hide interval 2 from the graph?'));assert(a.el('#app').innerHTML.includes('measurement or timing problem'));assert(a.el('#app').innerHTML.match(/id="confirm-hide"[^>]+/)[0].includes('disabled'));assert(!a.el('#app').innerHTML.match(/id="dialog-reason"[^>]+/)[0].includes('placeholder='));
 a.click('choose-reason',0,{reason:'reasonHigh'});assert.equal(a.state.dialogDraft,'It is much higher than nearby velocities.');
 a.input('dialogReason',0,'High');a.click('hide-bar');assert.equal(a.state.excluded[1],true);assert.equal(a.state.exclusionReasons[1],'High');assert(a.el('#app').innerHTML.includes('Not graphed'));assert(a.el('#app').innerHTML.includes('Change reason'));
 a.click('check-graph');assert.equal(a.state.message,'Your graph is ready! Which visible section has the tallest bar?');
 a.click('explain');assert(a.el('#app').innerHTML.includes('Interval 2:'));assert(a.el('#app').innerHTML.includes('⊘'));
 a.write('Interval 2 looked unusual, so I compared the other visible bars.');await a.requestFeedback();
 assert.deepEqual(payload.excludedIntervals,[{interval:2,reason:'High'}]);
 a.click('back-graph');a.hide(2,'It does not fit the pattern.');a.hide(3,'It may have a timing problem.');a.hide(4,'It is much lower than nearby velocities.');a.click('flag-outlier',5);
 assert.equal(a.state.excluded.filter(Boolean).length,4);assert.equal(a.state.dialogIndex,null);assert.equal(a.state.message,'The graph must keep at least three visible velocities.');
 a.click('show-bar',1);assert.equal(a.state.excluded[1],false);assert(a.el('#app').innerHTML.includes('This bar looks unusual'));
});
test('missing exclusion reason returns to the exact field instead of a generic graph error',async()=>{
 let calls=0;const a=app(async()=>{calls++;return {ok:true,json:async()=>({feedback})};});a.state.excluded[2]=true;a.state.exclusionReasons[2]='';a.click('explain');a.write('Interval 3 may be unusual compared with the other velocities.');await a.requestFeedback();
 assert.equal(calls,0);assert.equal(a.state.stage,2);assert.equal(a.state.dialogIndex,2);assert.equal(a.state.message,'Add a reason for hidden interval 3.');assert.equal(a.el('#dialog-reason').focused,true);
});
test('compact preview ignores a very large hidden velocity when choosing its scale',()=>{
 const a=app();a.state.heights[0]='80';a.state.scale=80;a.hide(0,'This value is much larger than all nearby velocities.');
 const preview=a.compactGraphScale();assert(preview.scale<80);assert(preview.ticks.length<=7);
 a.click('explain');assert(a.el('#app').innerHTML.includes('Not graphed'));assert(a.el('#app').innerHTML.includes('height:338px'));
});
test('traffic light uses consistent checklist rules and becomes stale after editing',async()=>{
 const green=structuredClone(feedback);assert.equal(app().feedbackProgress(green).color,'green');
 const yellow=structuredClone(feedback);yellow.checklist.reasoning.status='almost';assert.equal(app().feedbackProgress(yellow).color,'yellow');
 const red=structuredClone(feedback);for(const key of ['change','pattern','reasoning'])red.checklist[key].status='add';assert.equal(app().feedbackProgress(red).color,'red');
 assert.equal(app().feedbackProgress(green,true).color,'stale');
 const a=app(async()=>({ok:true,json:async()=>({feedback:green})}));a.click('explain');a.write('The average velocity increased across the visible intervals.');await a.requestFeedback();assert(a.el('#app').innerHTML.includes('Ready for a final check'));a.write('I changed this answer.');assert.equal(a.el('#feedback-traffic').className,'traffic stale');assert.equal(a.el('#traffic-title').textContent,'Check your revision again');
});
