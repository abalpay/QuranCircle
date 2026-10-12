/* eslint-disable @typescript-eslint/no-require-imports */
// Run with npm run test:security:email.
// Real signature verification; rendering and delivery are stubbed, so no mail is sent.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { Webhook } = require('standardwebhooks');
const key = Buffer.alloc(32, 7).toString('base64');
const body = JSON.stringify({user:{email:'test@example.invalid'},email_data:{email_action_type:'recovery',token_hash:'synthetic',redirect_to:'https://example.invalid'}});
function load(secret = `v1,whsec_${key}`) {
  let handler; const sent = [];
  const code = ts.transpileModule(readFileSync('supabase/functions/send-email/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const deps = {
    'npm:react@18.3.1': {createElement:()=>({})},
    'https://esm.sh/standardwebhooks@1.0.0':{Webhook},
    'npm:resend@4.0.0':{Resend:class {emails={send:async x=>{sent.push(x);return {error:null}}}}},
    'npm:@react-email/components@0.0.22':{renderAsync:async()=>'<html>test</html>'},
    './_templates/signup.tsx':{SignupEmail:()=>null},
    './_templates/reset-password.tsx':{ResetPasswordEmail:()=>null},
  };
  vm.runInNewContext(code,{exports:{},require:name=>{assert.ok(deps[name],name);return deps[name]},Request,Response,console:{log(){},warn(){},error(){}},Deno:{env:{get:name=>name==='SEND_EMAIL_HOOK_SECRET'?secret:'synthetic'},serve:fn=>{handler=fn}}});
  return {handler,sent};
}
function signed(payload=body, date=new Date()) {
  const id='synthetic-hook-id';
  return {'webhook-id':id,'webhook-timestamp':String(Math.floor(date.getTime()/1000)),'webhook-signature':new Webhook(`whsec_${key}`).sign(id,date,payload)};
}
for(const secret of [key,`whsec_${key}`,`v1,whsec_${key}`]) test(`valid signature accepted (${secret.startsWith('v1')?'supabase':secret.startsWith('whsec')?'prefixed':'raw'} format)`,async()=>{
 const {handler,sent}=load(secret);const r=await handler(new Request('https://example.invalid',{method:'POST',headers:signed(),body}));assert.equal(r.status,200);assert.equal(sent.length,1);
});
for(const [name,headers,payload] of [
 ['missing',{},body],['invalid',{'webhook-id':'x','webhook-timestamp':String(Math.floor(Date.now()/1000)),'webhook-signature':'v1,bad'},body],
 ['stale',signed(body,new Date(Date.now()-600000)),body],['tampered',signed(),body.replace('recovery','invite')],
]) test(`${name} signature denied before mail`,async()=>{const {handler,sent}=load();const r=await handler(new Request('https://example.invalid',{method:'POST',headers,body:payload}));assert.equal(r.status,401);assert.equal(sent.length,0)});
test('missing configuration fails closed',async()=>{const {handler,sent}=load('');assert.equal((await handler(new Request('https://example.invalid',{method:'POST',body}))).status,500);assert.equal(sent.length,0)});
