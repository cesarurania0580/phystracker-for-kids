import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {prepareSubmission,getFeedback,providerConfig} from './feedback.mjs';

export function createHandler(options={}) {
  const {apiKey,model,provider,fetchImpl=fetch,maxRequests=120}={...providerConfig(),...options};
  // A process-wide hourly cap also works when a class shares one network address.
  let windowStart=Date.now(),requests=0,active=0;
  const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  return async(req,res)=>{
    const pathname=req.url?.split('?')[0];
    if(pathname==='/api/feedback'){
      if(req.method!=='POST')return send(res,405,{error:'method'});
      if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}` && req.headers.origin!==`https://${req.headers.host}`)return send(res,403,{error:'origin'});
      if(!apiKey)return send(res,503,{error:'not_configured'});
      if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'invalid'});
      let body;
      try{
        let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>16000)return send(res,413,{error:'too_large'});}
        body=prepareSubmission(JSON.parse(text));
      }catch{return send(res,400,{error:'invalid'});}
      if(Date.now()-windowStart>=3600000){windowStart=Date.now();requests=0;}
      if(requests>=maxRequests||active>=8)return send(res,429,{error:'busy'});
      requests++;active++;
      try{return send(res,200,{feedback:await getFeedback(body,{apiKey,model,provider,fetchImpl})});}
      catch(error){return send(res,error.message==='provider_limit'?429:502,{error:error.message==='provider_auth'?'provider_auth':error.message==='provider_limit'?'busy':'unavailable'});}
      finally{active--;}
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'method'});
    const files={'/':['index.html','text/html; charset=utf-8'],'/index.html':['index.html','text/html; charset=utf-8'],'/assets/phystracker-logo.png':['assets/phystracker-logo.png','image/png']};
    if(!Object.hasOwn(files,pathname))return send(res,404,{error:'not_found'});
    try{const [file,type]=files[pathname];const data=await readFile(new URL(file,import.meta.url));res.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);}
    catch{return send(res,500,{error:'unavailable'});}
  };
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
  createServer(createHandler()).listen(port,host,()=>console.log(`PhysTracker: http://${host}:${port} (AI feedback ${providerConfig().apiKey?providerConfig().provider+' configured':'not configured'})`));
}
