import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,cpSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {join,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
const root=resolve(import.meta.dirname,'..');
test('静态导出只保留公开字段，采用子路径兼容的链接并排除后台代码',()=>{
 const fixture=mkdtempSync(join(tmpdir(),'blog-static-'));
 try{
  for(const folder of ['scripts','server','public'])cpSync(join(root,folder),join(fixture,folder),{recursive:true});
  for(const folder of ['html/images','html/videos','data'])mkdirSync(join(fixture,folder),{recursive:true});
  writeFileSync(join(fixture,'html/images/show.ico'),'fixture');writeFileSync(join(fixture,'html/private.html'),'historical-private-contact');writeFileSync(join(fixture,'.env'),'ADMIN_PASSWORD=secret-fixture-only');
  const db=new DatabaseSync(join(fixture,'data/blog.sqlite'));
  db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY,username TEXT,display_name TEXT,password_hash TEXT); CREATE TABLE posts(id INTEGER PRIMARY KEY,slug TEXT,title TEXT,date TEXT,category TEXT,tags TEXT,excerpt TEXT,content TEXT,featured INTEGER,author_id INTEGER); CREATE TABLE sessions(token_hash TEXT);');
  db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(1,'private-login-name','公开作者','private-password-hash');
  db.prepare('INSERT INTO posts VALUES(?,?,?,?,?,?,?,?,?,?)').run(1,'hello','标题','2026-10-09','分类','["标签"]','摘要','正文',0,1);db.close();
  execFileSync(process.execPath,[join(fixture,'scripts/build-static.mjs')],{env:{...process.env,DATA_DIR:join(fixture,'data')},stdio:['ignore','pipe','pipe']});
  const exported=JSON.parse(readFileSync(join(fixture,'dist/content/posts.json'),'utf8'));assert.equal(exported.length,1);assert.equal(exported[0].author,'公开作者');const serialized=JSON.stringify(exported);assert.ok(!serialized.includes('private-'));assert.ok(!Object.hasOwn(exported[0],'author_id'));
  const html=readFileSync(join(fixture,'dist/index.html'),'utf8'),app=readFileSync(join(fixture,'dist/app.js'),'utf8');assert.ok(html.includes('src="./app.js"'));assert.ok(html.includes('href="./#/archive"'));assert.ok(!html.includes('href="/admin"'));assert.ok(!app.includes('async function admin('));assert.ok(app.includes('href="./#/post/'));assert.ok(readFileSync(join(fixture,'dist/site-config.js'),'utf8').includes('staticSite=true'));
  const entries=readdirSync(join(fixture,'dist'));assert.ok(!entries.includes('server'));assert.ok(!entries.includes('.env'));assert.ok(!entries.includes('data'));
  execFileSync(process.execPath,[join(fixture,'scripts/build-static.mjs'),'--seed-only'],{env:{...process.env,DATA_DIR:join(fixture,'data')},stdio:['ignore','pipe','pipe']});assert.equal(JSON.parse(readFileSync(join(fixture,'dist/content/posts.json'),'utf8')).length,5);
 }finally{const safe=resolve(fixture);assert.ok(safe.startsWith(resolve(tmpdir())+sep)&&safe.includes('blog-static-'));rmSync(safe,{recursive:true,force:true});}
});
