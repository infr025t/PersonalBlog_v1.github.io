import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
export const root=resolve(import.meta.dirname,'..');
export const dataDir=resolve(process.env.DATA_DIR||resolve(root,'data'));
export function openDatabase(){
 mkdirSync(dataDir,{recursive:true,mode:0o700});
 const db=new DatabaseSync(resolve(dataDir,'blog.sqlite'));
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT UNIQUE NOT NULL,display_name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('admin','author')),disabled INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS posts(id INTEGER PRIMARY KEY,slug TEXT UNIQUE NOT NULL,title TEXT NOT NULL,date TEXT NOT NULL,category TEXT NOT NULL,tags TEXT NOT NULL,excerpt TEXT NOT NULL,content TEXT NOT NULL,featured INTEGER DEFAULT 0,author_id INTEGER REFERENCES users(id));
 CREATE TABLE IF NOT EXISTS comments(id INTEGER PRIMARY KEY,name TEXT NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),csrf_token TEXT NOT NULL,expires_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);`);
 if(!db.prepare('PRAGMA table_info(posts)').all().some(c=>c.name==='author_id'))db.exec('ALTER TABLE posts ADD COLUMN author_id INTEGER REFERENCES users(id)');
 return db;
}
