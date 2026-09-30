import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {prepareSubmission,buildRequest,getFeedback,feedbackKeys,checklistKeys,validFeedback} from '../feedback.mjs';
import {createHandler} from '../server.mjs';
import {createFeedbackFunction} from '../netlify/functions/feedback.mjs';
const valid=()=>({language:'en',explanation:'The runner has equal average velocity in each interval.',rows:Array.from({length:6},(_,i)=>({t:i,x:i*2})),name:'Must not be sent'});
const feedback={strength:'You described the overall change.',checklist:Object.fromEntries(checklistKeys.map(key=>[key,{status:key==='anomalies'?'no_anomaly':'clear',comment:'A short observation.'}])),nextStep:'Check your units.',question:'What do equal bars tell you?'};
const mockProvider=async()=>({ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(feedback)}]}]})});
test('five-part checklist validates statuses and restricts no-anomaly to anomalies',()=>{
 assert.equal(validFeedback(feedback),true);
 const wrongStatus=structuredClone(feedback);wrongStatus.checklist.change.status='no_anomaly';assert.equal(validFeedback(wrongStatus),false);
 const missing=structuredClone(feedback);delete missing.checklist.language;assert.equal(validFeedback(missing),false);
 const empty=structuredClone(feedback);empty.checklist.anomalies.comment='';assert.equal(validFeedback(empty),false);
 const schema=buildRequest(prepareSubmission(valid()),'test').text.format.schema;
 assert.deepEqual(schema.properties.checklist.required,checklistKeys);
});
async function request(handler,{url='/api/feedback',method='POST',body=valid(),headers={}}={}){
  const req=Readable.from([typeof body==='string'?body:JSON.stringify(body)]);Object.assign(req,{url,method,headers:{host:'localhost:3000',origin:'http://localhost:3000','content-type':'application/json',...headers}});
  const res={writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=body;}};
  await handler(req,res);return res;
}
test('derive rounded evidence server-side and exclude nickname/extra client fields',()=>{
 const submission=prepareSubmission(valid());assert.equal(submission.intervals[0].averageVelocity,2);assert(!JSON.stringify(submission).includes('Must not be sent'));
 assert(submission.intervals.every(interval=>interval.shownInGraph===true));
 const withHidden=valid();withHidden.excludedIntervals=[{interval:2,reason:'This value is much higher than the nearby values.'}];const hiddenSubmission=prepareSubmission(withHidden);
 assert.equal(hiddenSubmission.intervals[1].shownInGraph,false);assert.match(hiddenSubmission.intervals[1].studentReasonForHiding,/much higher/);assert.equal(hiddenSubmission.intervals[0].shownInGraph,true);
 const request=buildRequest(submission,'test-model');assert.equal(request.store,false);assert.equal(request.text.format.strict,true);assert.equal(request.model,'test-model');assert.match(request.instructions,/not an official IB grade/);
 assert.match(buildRequest(hiddenSubmission,'test-model').instructions,/shownInGraph=false/);
 const unequal=valid();unequal.rows=[{t:0,x:0},{t:1.1,x:3},{t:2,x:7},{t:2.8,x:11},{t:3.5,x:15},{t:4.1,x:20}];assert.equal(prepareSubmission(unequal).intervals[0].averageVelocity,2.7);
 const zero=valid();zero.rows.forEach(r=>r.x=0);assert(prepareSubmission(zero).intervals.every(r=>r.averageVelocity===0));
});
test('reject malformed or unbounded input',()=>{
 for(const patch of [{explanation:'short'},{explanation:'x'.repeat(3001)},{language:'xx'},{rows:[]},{rows:[null,...valid().rows.slice(1)]}])assert.throws(()=>prepareSubmission({...valid(),...patch}));
 for(const value of [NaN,Infinity,'2',null]){const body=valid();body.rows[1].t=value;assert.throws(()=>prepareSubmission(body));}
 const body=valid();body.rows[1].t=0;assert.throws(()=>prepareSubmission(body));body.rows[1].t=1;body.rows[1].x=-1;assert.throws(()=>prepareSubmission(body));
 for(const excludedIntervals of [[{interval:1,reason:'short'}],[{interval:99,reason:'This explanation is long enough.'}],[{interval:1,reason:'This explanation is long enough.'},{interval:1,reason:'This is also long enough to validate.'}],Array.from({length:3},(_,i)=>({interval:i+1,reason:'This explanation is long enough.'}))])assert.throws(()=>prepareSubmission({...valid(),excludedIntervals}));
});
test('provider payload and structured response',async()=>{
 const result=await getFeedback(prepareSubmission(valid()),{apiKey:'test-secret',fetchImpl:async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.headers.Authorization,'Bearer test-secret');assert(!options.body.includes('Must not be sent'));return mockProvider();}});assert.deepEqual(result,feedback);
 for(const data of [{status:'incomplete',output:[]},{status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'No'}]}]},{status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{}'}]}]}])await assert.rejects(getFeedback(prepareSubmission(valid()),{apiKey:'test',fetchImpl:async()=>({ok:true,json:async()=>data})}));
});
test('handler: success, missing setup, rate cap, malformed and cross-origin requests',async()=>{
 const handler=createHandler({apiKey:'test',fetchImpl:mockProvider,maxRequests:1});
 assert.equal((await request(handler)).status,200);assert.equal((await request(handler)).status,429);
 assert.equal((await request(createHandler({apiKey:''}))).status,503);
 assert.equal((await request(handler,{body:'not json'})).status,400);
 assert.equal((await request(handler,{body:'x'.repeat(16001)})).status,413);
 assert.equal((await request(handler,{headers:{origin:'https://other.example'}})).status,403);
 assert.equal((await request(handler,{headers:{'content-type':'text/plain'}})).status,415);
 assert.equal((await request(handler,{method:'GET'})).status,405);
});
test('provider failures are safe and private server files cannot be served',async()=>{
 const handler=createHandler({apiKey:'secret',fetchImpl:async()=>{throw Error('secret provider diagnostic')}});
 const res=await request(handler);assert.equal(res.status,502);assert(!res.body.includes('secret'));
 for(const url of ['/.env','/server.mjs','/feedback.mjs','/.git/config','/../.env','/__proto__'])assert.equal((await request(handler,{url,method:'GET'})).status,404);
 assert.equal((await request(handler,{url:'/',method:'GET'})).status,200);
});

test('Z.AI uses its own endpoint and validates JSON feedback',async()=>{
 const {providerConfig,buildZaiRequest}=await import('../feedback.mjs');
 assert.deepEqual(providerConfig({AI_PROVIDER:'zai',ZAI_API_KEY:'z-key',OPENAI_API_KEY:'wrong-key'}),{provider:'zai',apiKey:'z-key',model:'glm-4.7'});
 assert.equal(providerConfig({AI_PROVIDER:'zai',OPENAI_API_KEY:'wrong-key'}).apiKey,undefined);
 assert.throws(()=>providerConfig({AI_PROVIDER:'typo'}));
 const requestBody=buildZaiRequest(prepareSubmission(valid()),'glm-4.7');assert.equal(requestBody.response_format.type,'json_object');assert.equal(requestBody.thinking.type,'disabled');assert(!Object.hasOwn(requestBody,'store'));
 const fetchImpl=async(url,options)=>{
   assert.equal(url,'https://api.z.ai/api/paas/v4/chat/completions');assert.equal(options.headers.Authorization,'Bearer z-key');
   const body=JSON.parse(options.body);assert.equal(body.model,'glm-4.7');assert.equal(body.messages[0].role,'system');assert.match(body.messages[0].content,/correct scientific reasoning/);
   return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(feedback),reasoning_content:'Never return this'}}]})};
 };
 assert.deepEqual(await getFeedback(prepareSubmission(valid()),{apiKey:'z-key',provider:'zai',fetchImpl}),feedback);
 const handler=createHandler({provider:'zai',apiKey:'z-key',model:'glm-4.7',fetchImpl});assert.equal((await request(handler)).status,200);
});
test('Z.AI rejects truncated, filtered, malformed and unexpected responses',async()=>{
 for(const [finish_reason,content] of [['length',JSON.stringify(feedback)],['sensitive',''],['stop','not JSON'],['stop',JSON.stringify({...feedback,unexpected:'extra'})]]){
   await assert.rejects(getFeedback(prepareSubmission(valid()),{apiKey:'test',provider:'zai',fetchImpl:async()=>({ok:true,json:async()=>({choices:[{finish_reason,message:{content}}]})})}));
 }
 for(const status of [401,403,429]){
   const handler=createHandler({provider:'zai',apiKey:'secret',fetchImpl:async()=>({ok:false,status})});const res=await request(handler);
   assert.equal(res.status,status===429?429:502);assert.equal(JSON.parse(res.body).error,status===429?'busy':'provider_auth');assert(!res.body.includes('secret'));
 }
});

test('Netlify function handles the same API contract', async()=>{
 const fetchImpl=async(url,options)=>{assert.equal(url,'https://api.z.ai/api/paas/v4/chat/completions');assert.equal(options.headers.Authorization,'Bearer netlify-key');return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(feedback)}}]})};};
 const handler=createFeedbackFunction({env:{AI_PROVIDER:'zai',ZAI_API_KEY:'netlify-key',ZAI_MODEL:'glm-4.7'},fetchImpl});
 const body=JSON.stringify(valid());
 const response=await handler(new Request('https://example.net/api/feedback',{method:'POST',headers:{'content-type':'application/json',origin:'https://example.net'},body}));
 assert.equal(response.status,200);assert.deepEqual((await response.json()).feedback,feedback);
 assert.equal((await handler(new Request('https://example.net/api/feedback',{method:'GET'}))).status,405);
 assert.equal((await handler(new Request('https://example.net/api/feedback',{method:'POST',headers:{'content-type':'application/json'},body:'bad'}))).status,400);
 const missing=createFeedbackFunction({env:{AI_PROVIDER:'zai'}});
 assert.equal((await missing(new Request('https://example.net/api/feedback',{method:'POST',headers:{'content-type':'application/json'},body}))).status,503);
 assert.equal((await handler(new Request('https://example.net/api/feedback',{method:'POST',headers:{'content-type':'application/json',origin:'https://other.example'},body}))).status,403);
});
