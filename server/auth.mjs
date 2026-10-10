import {randomBytes,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
export function fail(status,message){throw Object.assign(new Error(message),{status});}
export const validText=(v,min,max)=>typeof v==='string'&&v.trim().length>=min&&v.trim().length<=max;
export function validateAccount({username,display_name,password}){
 if(typeof username!=='string'||! /^[a-zA-Z0-9_]{3,32}$/.test(username))fail(400,'账号需为 3–32 位字母、数字或下划线');
 if(!validText(display_name,1,40))fail(400,'显示名称需为 1–40 字');
 validatePassword(password);
}
export function validatePassword(password){if(typeof password!=='string'||password.length<12||password.length>128||!password.trim())fail(400,'密码需为 12–128 位，请使用独立的长密码');}
// OWASP scrypt profile: N=2^15, r=8, p=3. Bound parallel work to limit memory use.
const params={N:32768,r:8,p:3,maxmem:64*1024*1024};let activeDerivations=0;
async function deriveKey(password,salt,options=params){
 if(activeDerivations>=4)fail(429,'登录服务繁忙，请稍后再试');
 activeDerivations++;try{return await derive(password,salt,64,options);}finally{activeDerivations--;}
}
export async function hashPassword(password){const salt=randomBytes(16).toString('hex'),key=await deriveKey(password,salt);return `scrypt:32768:8:3:${salt}:${key.toString('hex')}`;}
export async function verifyPassword(password,stored){
 const fields=stored.split(':');let salt,key,options=params;
 if(fields.length===6&&fields[0]==='scrypt'&&fields[1]==='32768'&&fields[2]==='8'&&fields[3]==='3'){salt=fields[4];key=fields[5];}
 else if(fields.length===3&&fields[0]==='scrypt'){salt=fields[1];key=fields[2];options={N:16384,r:8,p:1,maxmem:64*1024*1024};}
 else return false;
 if(!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(key))return false;
 const actual=await deriveKey(password,salt,options),expected=Buffer.from(key,'hex');return timingSafeEqual(actual,expected);
}
export const tokenHash=token=>createHash('sha256').update(token).digest('hex');
export const safeUser=u=>({id:u.id,username:u.username,display_name:u.display_name,role:u.role,disabled:!!u.disabled});
export async function createUser(db,input,role='author'){
 validateAccount(input);const hash=await hashPassword(input.password);
 try{const r=db.prepare('INSERT INTO users(username,display_name,password_hash,role,created_at) VALUES(?,?,?,?,?)').run(input.username.toLowerCase(),input.display_name.trim(),hash,role,new Date().toISOString());return safeUser(db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid));}catch(e){if(e.errcode===2067)fail(409,'此账号不可用');throw e;}
}
export function getSession(db,req){const token=req.headers.cookie?.match(/(?:^|;\s*)session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return null;return db.prepare('SELECT users.*,sessions.csrf_token,sessions.token_hash FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>? AND disabled=0').get(tokenHash(token),Date.now())||null;}
export function issueSession(db,res,user,secure){db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(tokenHash(token),user.id,csrf,Date.now()+12*3600000);res.setHeader('Set-Cookie',cookie(token,secure,43200));return csrf;}
export function cookie(token,secure,maxAge=0){return `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure?'; Secure':''}`;}
export function requireSession(db,req,write=false){const u=getSession(db,req);if(!u)fail(401,'请先登录');if(write){const csrf=req.headers['x-csrf-token'];if(typeof csrf!=='string'||csrf!==u.csrf_token)fail(403,'会话验证失效，请刷新页面后重试');}return u;}
export function requireAdmin(user){if(user.role!=='admin')fail(403,'需要管理员权限');}
