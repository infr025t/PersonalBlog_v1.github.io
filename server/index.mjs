import http from 'node:http';
import {existsSync,statSync,createReadStream} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {posts,resources} from './seed.mjs';
import {openDatabase,root} from './db.mjs';
import {fail,validText,validatePassword,hashPassword,verifyPassword,createUser,safeUser,getSession,requireSession,requireAdmin,issueSession,cookie,tokenHash} from './auth.mjs';
const accountsEnabled=process.env.ENABLE_ACCOUNTS==='true';
const production=process.env.NODE_ENV==='production',secure=process.env.COOKIE_SECURE==='true'||production;
const configuredOrigin=process.env.PUBLIC_ORIGIN||(process.env.RENDER_EXTERNAL_HOSTNAME?`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`:'');
if(production&&(!configuredOrigin||new URL(configuredOrigin).protocol!=='https:'||process.env.COOKIE_SECURE==='false'))throw new Error('生产环境需要 HTTPS 的 PUBLIC_ORIGIN，且不得关闭安全 Cookie');
if(configuredOrigin&&new URL(configuredOrigin).origin!==configuredOrigin)throw new Error('PUBLIC_ORIGIN 应为完整域名，不带路径或末尾斜杠');
const db=openDatabase();
if(!db.prepare("SELECT key FROM settings WHERE key='seeded'").get()){
 if(!db.prepare('SELECT count(*) n FROM posts').get().n){const insert=db.prepare('INSERT INTO posts(slug,title,date,category,tags,excerpt,content,featured) VALUES(?,?,?,?,?,?,?,?)');db.exec('BEGIN');for(const p of posts)insert.run(p.slug,p.title,p.date,p.category,JSON.stringify(p.tags),p.excerpt,p.content,p.featured);db.exec('COMMIT');}
 db.prepare('INSERT INTO settings VALUES(?,?)').run('seeded',1);
}
if(accountsEnabled&&!db.prepare('SELECT count(*) n FROM users').get().n&&process.env.ADMIN_USERNAME&&process.env.ADMIN_PASSWORD){const u=await createUser(db,{username:process.env.ADMIN_USERNAME,display_name:process.env.ADMIN_DISPLAY_NAME||'站长',password:process.env.ADMIN_PASSWORD},'admin');db.prepare('UPDATE posts SET author_id=? WHERE author_id IS NULL').run(u.id);}
// Bootstrap credentials are only consumed for an empty user table, never a password reset.
const firstAdmin=db.prepare("SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1").get();
if(firstAdmin)db.prepare('UPDATE posts SET author_id=? WHERE author_id IS NULL').run(firstAdmin.id);
delete process.env.ADMIN_PASSWORD;
const dummyHash=await hashPassword('dummy-'+crypto.randomUUID()),rates=new Map();
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
const postSelect='SELECT posts.*,users.display_name AS author FROM posts LEFT JOIN users ON users.id=posts.author_id';
const decode=({author_id,...p})=>({...p,tags:JSON.parse(p.tags),author:p.author||'000lll'});
async function body(req){if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))fail(415,'请求需要 JSON 格式');let length=0,chunks=[];for await(const c of req){length+=c.length;if(length>100000)fail(413,'内容太长');chunks.push(c);}try{const b=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!b||typeof b!=='object'||Array.isArray(b))fail(400,'请求格式错误');return b;}catch{fail(400,'请求格式错误');}}
function limited(key,max,window){const now=Date.now();if(rates.size>=10000){for(const [k,r]of rates)if(r.end<=now)rates.delete(k);if(rates.size>=10000&&!rates.has(key))return true;}let r=rates.get(key);if(!r||r.end<=now){r={end:now+window,count:0};rates.set(key,r);}return ++r.count>max;}
function validatePost(p){if(!validText(p.title,1,150)||!validText(p.slug,1,100)||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)||!validText(p.category,1,40)||!validText(p.excerpt,1,500)||!validText(p.content,1,50000)||!Array.isArray(p.tags)||p.tags.length>10||!p.tags.every(t=>validText(t,1,30))||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||isNaN(Date.parse(p.date))||new Date(p.date).toISOString().slice(0,10)!==p.date)fail(400,'请检查文章字段、日期和英文短链接');}
function ownPost(user,id){const p=db.prepare('SELECT * FROM posts WHERE id=?').get(id);if(!p)fail(404,'文章不存在');if(user.role!=='admin'&&p.author_id!==user.id)fail(403,'只能管理自己的文章');return p;}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
 res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
 try{
 const url=new URL(req.url,'http://localhost'),path=decodeURIComponent(url.pathname),method=req.method,ip=req.socket.remoteAddress;
 if(path.startsWith('/api/')){
  if(!accountsEnabled&&(/^\/api\/(admin|account)(?:\/|$)/.test(path)||['/api/login','/api/logout','/api/register','/api/session'].includes(path)))return json(res,404,{error:'账号系统暂时搁置'});
  if(!['GET','HEAD'].includes(method)){
   const allowed=configuredOrigin||`http://${req.headers.host}`;
   if(req.headers.origin&&req.headers.origin!==allowed)fail(403,'请求来源不允许');
   if(req.headers['sec-fetch-site']==='cross-site')fail(403,'请求来源不允许');
   if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))fail(415,'请求需要 JSON 格式');
  }
  if(path==='/api/health'&&method==='GET')return json(res,200,{ok:true});
  if(path==='/api/posts'&&method==='GET'){let list=db.prepare(postSelect+' ORDER BY date DESC,posts.id DESC').all().map(decode);const q=(url.searchParams.get('q')||'').toLowerCase(),tag=url.searchParams.get('tag');return json(res,200,list.filter(p=>(!q||[p.title,p.excerpt,p.content,...p.tags].join(' ').toLowerCase().includes(q))&&(!tag||p.tags.includes(tag))));}
  if(/^\/api\/posts\/[^/]+$/.test(path)&&method==='GET'){const p=db.prepare(postSelect+' WHERE slug=?').get(path.split('/').pop());return json(res,p?200:404,p?decode(p):{error:'文章不存在'});}
  if(path==='/api/resources'&&method==='GET')return json(res,200,resources);
  if(path==='/api/stats'&&method==='GET')return json(res,200,{posts:db.prepare('SELECT count(*) n FROM posts').get().n,comments:db.prepare('SELECT count(*) n FROM comments').get().n,since:2021});
  if(path==='/api/comments'&&method==='GET')return json(res,200,db.prepare('SELECT * FROM comments ORDER BY id DESC LIMIT 200').all());
  if(path==='/api/comments'&&method==='POST'){if(limited('comment:'+ip,5,60000))fail(429,'留言太快了，请稍后再试');const b=await body(req);if(!validText(b.name,1,40)||!validText(b.content,1,1000))fail(400,'昵称需 1–40 字，留言需 1–1000 字');const r=db.prepare('INSERT INTO comments(name,content,created_at) VALUES(?,?,?)').run(b.name.trim(),b.content.trim(),new Date().toISOString());return json(res,201,{id:Number(r.lastInsertRowid)});}
  if(path==='/api/session'&&method==='GET'){const u=getSession(db,req);return json(res,200,{authenticated:!!u,configured:!!db.prepare('SELECT id FROM users LIMIT 1').get(),registration:process.env.ALLOW_REGISTRATION==='true',user:u?safeUser(u):null,csrf_token:u?.csrf_token||null});}
  if(path==='/api/login'&&method==='POST'){
   if(limited('login-ip:'+ip,30,300000))fail(429,'尝试次数过多，请五分钟后再试');const b=await body(req);
   const username=typeof b.username==='string'?b.username.toLowerCase().slice(0,128):'';
   if(limited('login-account:'+tokenHash(username),10,300000))fail(429,'尝试次数过多，请五分钟后再试');
   if(typeof b.password!=='string'||b.password.length>128)fail(401,'账号或密码不正确');
   const u=db.prepare('SELECT * FROM users WHERE username=?').get(username),ok=await verifyPassword(b.password,u?.password_hash||dummyHash);
   if(!u||u.disabled||!ok)fail(401,'账号或密码不正确');
   const old=getSession(db,req);if(old)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(old.token_hash);
   return json(res,200,{user:safeUser(u),csrf_token:issueSession(db,res,u,secure)});
  }
  if(path==='/api/register'&&method==='POST'){
   if(process.env.ALLOW_REGISTRATION!=='true')fail(403,'公开注册已关闭，请联系管理员创建作者账号');
   if(!db.prepare("SELECT id FROM users WHERE role='admin' AND disabled=0").get())fail(503,'请先由站长初始化管理员');
   if(limited('register:'+ip,5,3600000))fail(429,'注册太频繁，请稍后再试');const u=await createUser(db,await body(req),'author');return json(res,201,{user:u});
  }
  if(path==='/api/logout'&&method==='POST'){const u=requireSession(db,req,true);db.prepare('DELETE FROM sessions WHERE token_hash=?').run(u.token_hash);res.setHeader('Set-Cookie',cookie('',secure));return json(res,200,{ok:true});}
  if(path==='/api/account/password'&&method==='PUT'){
   const u=requireSession(db,req,true);if(limited('password:'+u.id,5,300000))fail(429,'尝试次数过多，请稍后再试');const b=await body(req);validatePassword(b.new_password);
   if(typeof b.current_password!=='string'||b.current_password.length>128||!await verifyPassword(b.current_password,u.password_hash))fail(400,'当前密码不正确');
   const hash=await hashPassword(b.new_password);db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash,u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);res.setHeader('Set-Cookie',cookie('',secure));return json(res,200,{ok:true});
  }
  if(path.startsWith('/api/admin/')){
   const u=requireSession(db,req,!['GET','HEAD'].includes(method)),id=Number(path.split('/').pop());
   if(path==='/api/admin/posts'&&method==='GET')return json(res,200,db.prepare(postSelect+(u.role==='admin'?'':' WHERE author_id=?')+' ORDER BY date DESC,posts.id DESC').all(...(u.role==='admin'?[]:[u.id])).map(decode));
   if(path==='/api/admin/posts'&&method==='POST'){const p=await body(req);validatePost(p);const r=db.prepare('INSERT INTO posts(slug,title,date,category,tags,excerpt,content,featured,author_id) VALUES(?,?,?,?,?,?,?,?,?)').run(p.slug,p.title,p.date,p.category,JSON.stringify(p.tags),p.excerpt,p.content,u.role==='admin'&&p.featured?1:0,u.id);return json(res,201,{id:Number(r.lastInsertRowid)});}
   if(/^\/api\/admin\/posts\/\d+$/.test(path)&&method==='PUT'){const old=ownPost(u,id),p=await body(req);validatePost(p);db.prepare('UPDATE posts SET slug=?,title=?,date=?,category=?,tags=?,excerpt=?,content=?,featured=? WHERE id=?').run(p.slug,p.title,p.date,p.category,JSON.stringify(p.tags),p.excerpt,p.content,u.role==='admin'?(p.featured?1:0):old.featured,id);return json(res,200,{ok:true});}
   if(/^\/api\/admin\/posts\/\d+$/.test(path)&&method==='DELETE'){ownPost(u,id);db.prepare('DELETE FROM posts WHERE id=?').run(id);return json(res,200,{ok:true});}
   requireAdmin(u);
   if(path==='/api/admin/users'&&method==='GET')return json(res,200,db.prepare('SELECT * FROM users ORDER BY id').all().map(safeUser));
   if(path==='/api/admin/users'&&method==='POST'){if(limited('create-user:'+u.id,20,3600000))fail(429,'创建账号太频繁，请稍后再试');const b=await body(req);if(!['admin','author'].includes(b.role))fail(400,'账号角色无效');return json(res,201,{user:await createUser(db,b,b.role)});}
   if(/^\/api\/admin\/users\/\d+$/.test(path)&&method==='PATCH'){const b=await body(req);if(typeof b.disabled!=='boolean')fail(400,'账号状态无效');if(id===u.id)fail(400,'不能停用当前登录账号');const r=db.prepare('UPDATE users SET disabled=? WHERE id=?').run(b.disabled?1:0,id);if(!r.changes)fail(404,'账号不存在');db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);return json(res,200,{ok:true});}
   if(/^\/api\/admin\/comments\/\d+$/.test(path)&&method==='DELETE'){const r=db.prepare('DELETE FROM comments WHERE id=?').run(id);if(!r.changes)fail(404,'留言不存在');return json(res,200,{ok:true});}
  }
  return json(res,404,{error:'接口不存在'});
 }
 if(!['GET','HEAD'].includes(method))fail(405,'不支持的方法');
 if(/(?:^|\/)\./.test(path)||/^\/(data|backups|server|scripts|tests|exports)(?:\/|$)/.test(path))fail(404,'文件不存在');
 const asset=path.startsWith('/assets/');if(asset&&(!/^\/assets\/(images|videos)\/[^/]+$/.test(path)||!['.jpg','.png','.ico','.cur','.mp4'].includes(extname(path).toLowerCase())))fail(404,'文件不存在');const base=resolve(root,asset?'html':'public'),relative=asset?path.slice(8):path.slice(1);
 let file=resolve(base,relative||'index.html');if(file!==base&&!file.startsWith(base+sep))fail(403,'禁止访问');
 if(!existsSync(file)||!statSync(file).isFile()){if(extname(path)||asset)fail(404,'文件不存在');file=resolve(root,'public/index.html');}
 const size=statSync(file).size,mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.ico':'image/x-icon','.mp4':'video/mp4','.svg':'image/svg+xml'}[extname(file)]||'application/octet-stream';
 res.setHeader('Content-Type',mime);res.setHeader('Accept-Ranges','bytes');res.setHeader('Cache-Control','no-cache');
 let start=0,end=size-1,status=200;
 if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);start=m&&m[1]?Number(m[1]):m&&m[2]?Math.max(0,size-Number(m[2])):-1;end=m&&m[1]&&m[2]?Math.min(Number(m[2]),size-1):size-1;if(!m||start<0||start>=size||end<start){res.writeHead(416,{'Content-Range':`bytes */${size}`});return res.end();}status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);}
 res.writeHead(status,{'Content-Length':Math.max(0,end-start+1)});if(method==='HEAD'||size===0)return res.end();const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);
 }catch(e){if(res.headersSent){res.destroy();return;}const conflict=e.errcode===2067;json(res,e.status||(conflict?409:500),{error:e.status?e.message:conflict?'短链接已存在或数据不合法':'服务器暂时无法处理请求'});if(!e.status&&!conflict)console.error('请求处理失败');}
});
server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log(`博客已启动 http://${process.env.HOST||'127.0.0.1'}:${server.address().port}`));
function shutdown(){server.close(()=>{db.close();process.exit(0);});setTimeout(()=>process.exit(0),5000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
