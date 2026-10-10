import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
const root=resolve(import.meta.dirname,'..');
async function account(env,reset=false){
 const child=spawn(process.execPath,['scripts/account.mjs',...(reset?['--reset-password']:[])],{cwd:root,env:{...process.env,...env},stdio:['pipe','pipe','pipe']});let output='',errors='',waiters=[];
 child.stdout.on('data',c=>{output+=c;for(const check of waiters)check();});child.stderr.on('data',c=>errors+=c);
 const completion=new Promise((ok,no)=>{child.on('error',no);child.on('exit',code=>ok({code,output,errors}));});
 async function answer(prompt,value){await new Promise((ok,no)=>{const timer=setTimeout(()=>{child.kill();no(new Error('CLI prompt timed out: '+prompt));},5000);const check=()=>{if(output.includes(prompt)){clearTimeout(timer);waiters=waiters.filter(w=>w!==check);ok();}};waiters.push(check);check();});child.stdin.write(value+'\n');}
 await answer('账号（','cli_admin');if(!reset)await answer('公开显示名称：','测试站长');await answer('密码（',reset?'changed-cli-password':'initial-cli-password');await answer('再次输入密码：',reset?'changed-cli-password':'initial-cli-password');return completion;
}
test('终端账号初始化、拒绝重复初始化、密码重置与在线备份',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'blog-ops-')),env={DATA_DIR:dir,BACKUP_DIR:join(dir,'private-backups')};
 try{
  const initialized=await account(env);assert.equal(initialized.code,0,initialized.errors);assert.ok(!initialized.output.includes('initial-cli-password'));
  const db=new DatabaseSync(join(dir,'blog.sqlite'));let u=db.prepare('SELECT * FROM users').get();assert.equal(u.role,'admin');assert.equal(u.username,'cli_admin');db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run('fake-token-hash',u.id,'fake-csrf-token',Date.now()+10000);const oldHash=u.password_hash;
  assert.throws(()=>execFileSync(process.execPath,['scripts/account.mjs'],{cwd:root,env:{...process.env,...env},stdio:['ignore','pipe','pipe']}));
  const reset=await account(env,true);assert.equal(reset.code,0,reset.errors);u=db.prepare('SELECT * FROM users').get();assert.notEqual(u.password_hash,oldHash);assert.equal(u.role,'admin');assert.equal(db.prepare('SELECT count(*) n FROM sessions').get().n,0);
  execFileSync(process.execPath,['scripts/backup.mjs'],{cwd:root,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});const files=readdirSync(env.BACKUP_DIR);assert.equal(files.length,1);const copy=new DatabaseSync(join(env.BACKUP_DIR,files[0]),{readOnly:true});assert.equal(copy.prepare('SELECT username FROM users').get().username,'cli_admin');copy.close();db.close();
 }finally{const safe=resolve(dir);assert.ok(safe.startsWith(resolve(tmpdir())+sep)&&safe.includes('blog-ops-'));rmSync(safe,{recursive:true,force:true});}
});
