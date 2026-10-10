import {mkdirSync,readFileSync,writeFileSync,existsSync,readdirSync,copyFileSync,rmSync,lstatSync} from 'node:fs';
import {resolve,join,extname} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {posts as initialPosts,resources} from '../server/seed.mjs';
const root=resolve(import.meta.dirname,'..');
const out=resolve(process.env.STATIC_OUT_DIR||resolve(root,'dist'));
if(out!==resolve(root,'dist'))throw new Error('静态输出仅允许项目下的 dist 目录');
if(existsSync(out)){if(lstatSync(out).isSymbolicLink())throw new Error('输出目录不能为符号链接');rmSync(out,{recursive:true,force:true});}
mkdirSync(join(out,'content'),{recursive:true});
let posts=initialPosts.map((p,index)=>({...p,id:index+1,author:'000lll'}));
const database=resolve(process.env.DATA_DIR||resolve(root,'data'),'blog.sqlite');
if(!process.argv.includes('--seed-only')&&existsSync(database)){
 const db=new DatabaseSync(database,{readOnly:true});
 try{const hasAuthors=db.prepare('PRAGMA table_info(posts)').all().some(c=>c.name==='author_id');
 const rows=db.prepare(hasAuthors?'SELECT posts.*,users.display_name AS author FROM posts LEFT JOIN users ON users.id=posts.author_id ORDER BY date DESC,posts.id DESC':'SELECT * FROM posts ORDER BY date DESC,id DESC').all();
 posts=rows.map(p=>({id:p.id,slug:p.slug,title:p.title,date:p.date,category:p.category,tags:JSON.parse(p.tags),excerpt:p.excerpt,content:p.content,featured:p.featured,author:p.author||'000lll'}));
 }finally{db.close();}
}
writeFileSync(join(out,'content/posts.json'),JSON.stringify(posts,null,2));
writeFileSync(join(out,'content/resources.json'),JSON.stringify(resources,null,2));
for(const name of ['index.html','app.js','style.css','background.js','theme.js']){
 let source=readFileSync(join(root,'public',name),'utf8');
 if(name==='app.js'){const begin=source.indexOf('async function admin(version)'),end=source.indexOf('// Public page controls',begin);if(begin<0||end<0)throw new Error('无法定位已搁置的后台模块');source=source.slice(0,begin)+source.slice(end);}
 if(name==='index.html'||name==='app.js')source=source.replaceAll('href="/assets/','href="./assets/').replaceAll('src="/assets/','src="./assets/').replaceAll('src="/theme.js"','src="./theme.js"').replaceAll('src="/app.js"','src="./app.js"').replaceAll('href="/style.css"','href="./style.css"').replaceAll('href="/','href="./#/');
 writeFileSync(join(out,name),source);
}
writeFileSync(join(out,'site-config.js'),'export const staticSite=true;\n');writeFileSync(join(out,'.nojekyll'),'');
for(const folder of ['images','videos']){const from=join(root,'html',folder),to=join(out,'assets',folder);mkdirSync(to,{recursive:true});for(const entry of readdirSync(from,{withFileTypes:true})){if(entry.isFile()&&['.jpg','.png','.ico','.cur','.mp4'].includes(extname(entry.name).toLowerCase()))copyFileSync(join(from,entry.name),join(to,entry.name));}}
console.log(`已导出 ${posts.length} 篇公开文章到 dist/；未导出账号、数据库、留言或后端。`);
