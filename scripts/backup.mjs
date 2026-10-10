import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {resolve} from 'node:path';
import {dataDir,root} from '../server/db.mjs';
const out=resolve(process.env.BACKUP_DIR||resolve(root,'backups'));
mkdirSync(out,{recursive:true,mode:0o700});
const file=resolve(out,`blog-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);
const db=new DatabaseSync(resolve(dataDir,'blog.sqlite'),{readOnly:true});
try{await backup(db,file);chmodSync(file,0o600);console.log('数据库备份已保存到 '+file+'，其中含账号哈希，请私密保存。');}finally{db.close();}
