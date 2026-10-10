import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,relative} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const blocked=p=>/(^|\/)(data|backups|exports|dist|\.aws|\.codex|\.agents)(\/|$)/.test(p)||/(^|\/)\.env(?:\.|$)/.test(p)&&!p.endsWith('.env.example')||/\.(sqlite(?:-.*)?|db(?:-.*)?|pem|key|p12|pfx|rar|zip)$/i.test(p)||/^html\/(?!images\/|videos\/)/.test(p);
const secretPattern=/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}/;
let files=[];
try{files=execFileSync('git',['ls-files','-z','--cached'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).split('\0').filter(Boolean);}catch{console.log('此目录尚未初始化 Git；检查可发布源码中的明显密钥模式。');}
let failed=false;
for(const file of files){if(blocked(file)){console.error('禁止上传的文件：'+file);failed=true;}}
function inspect(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const path=resolve(dir,item.name);if(item.isDirectory())inspect(path);else if(/\.(js|mjs|css|html|ya?ml)$/.test(path)&&secretPattern.test(readFileSync(path,'utf8'))){console.error('疑似密钥：'+relative(root,path));failed=true;}}}
for(const dir of ['public','server','scripts','.github'])if(existsSync(resolve(root,dir)))inspect(resolve(root,dir));
if(failed){console.error('检查未通过。请移除敏感文件；若已推送，还需要轮换凭据并清理 Git 历史。');process.exitCode=1;}else console.log('上传检查通过。此检查不能发现所有形式的秘密，发布前仍请检查暂存差异。');
