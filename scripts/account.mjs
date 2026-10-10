import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {openDatabase} from '../server/db.mjs';
import {createUser,validatePassword,hashPassword} from '../server/auth.mjs';
const db=openDatabase();let muted=false;
const output=new Writable({write(chunk,encoding,callback){if(!muted)process.stdout.write(chunk,encoding);callback();}});
output.isTTY=process.stdout.isTTY;
const rl=createInterface({input:process.stdin,output,terminal:!!process.stdin.isTTY});
async function question(prompt,secret=false){process.stdout.write(prompt);muted=secret;try{return await rl.question('');}finally{muted=false;if(secret)process.stdout.write('\n');}}
try{
 const reset=process.argv.includes('--reset-password');
 if(!reset&&db.prepare('SELECT id FROM users LIMIT 1').get())throw new Error('已有账号，请登录后台创建作者；忘记密码请使用 --reset-password。');
 const username=(await question('账号（3–32 位字母、数字、下划线）：')).trim().toLowerCase();
 const existing=reset?db.prepare('SELECT * FROM users WHERE username=?').get(username):null;
 if(reset&&!existing)throw new Error('账号不存在');
 const display_name=reset?existing.display_name:(await question('公开显示名称：')).trim();
 const password=await question('密码（至少 12 位，输入不会显示）：',true);
 const confirm=await question('再次输入密码：',true);
 if(password!==confirm)throw new Error('两次密码不一致');validatePassword(password);
 if(reset){const hash=await hashPassword(password);db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash,existing.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(existing.id);console.log('密码已重置，全部旧会话已失效。');}
 else{const user=await createUser(db,{username,display_name,password},'admin');db.prepare('UPDATE posts SET author_id=? WHERE author_id IS NULL').run(user.id);console.log('管理员已创建，可在 /admin 登录。');}
}catch(e){console.error(e.message);process.exitCode=1;}finally{rl.close();db.close();}
