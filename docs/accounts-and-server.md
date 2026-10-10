> 账号模块已搁置，默认不开放接口，前端也不显示登录与发帖入口。以下为之前服务端版本的参考说明。单独设置 ENABLE_ACCOUNTS=true 只能恢复接口；恢复网页后台需要重新启用 public/app.js 中的 admin 分支。纯静态站点不能运行这些功能。

# 一隅 · 000lll 的个人博客

一个可以阅读、留言、用账号发布文章的个人博客。原生 JavaScript 前端 + Node.js 后端 + SQLite 数据库，无需安装第三方依赖。

**最简单的上线方式：源码上传 GitHub → Render 连接仓库 → 创建带持久化磁盘的 Web Service。** 本项目已提供 `render.yaml`，账号密码只需填到托管平台，不写进仓库。

> GitHub Pages 只能托管静态页面，无法运行此项目的登录、发帖或数据库。把代码上传 GitHub 本身不会让后端上线。完整博客请使用下述后端托管方案。参考 [GitHub 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。

## 1. 本地试用（先完成这一步）

需要 Node.js **24 或更新版本**。打开项目目录，在 PowerShell 中执行：

```powershell
node server/index.mjs
```

浏览器打开 <http://127.0.0.1:3000>。停止时按 Ctrl+C。首次启动自动创建 `data/blog.sqlite`；原来的文章和留言会保留，数据库会自动补齐账号字段。

### 创建你的第一个管理员

不提供默认账号或默认密码。只在你的电脑或服务器终端中执行：

```powershell
node scripts/account.mjs
```

依次输入登录账号、公开显示名称、密码和密码确认。账号由 3–32 位字母、数字、下划线组成；密码至少 12 位，输入时不显示在终端。使用密码管理器生成独立长密码。不要把真实密码写进命令行、聊天、截图或 README。

然后访问 <http://127.0.0.1:3000/admin> 登录。若服务器已在运行，创建账号后直接刷新登录页即可。

### 创建作者账号与发帖

1. 管理员登录 `/admin`。
2. 在「账号管理」填写新账号、显示名称、初始密码，角色选择「作者」。
3. 通过私密渠道把账号交给使用者，使用者首次登录后在「修改我的密码」中更换密码。
4. 作者登录，点击「写新文章」，填写标题、英文短链接、分类、摘要与正文，再保存发布。

| 功能 | 未登录访客 | 作者 | 管理员 |
| --- | --- | --- | --- |
| 阅读、搜索、留言 | 可以 | 可以 | 可以 |
| 发帖 | 不可以 | 可以 | 可以 |
| 编辑、删除文章 | 不可以 | 仅自己的 | 全部 |
| 文章置顶 | 不可以 | 不可以 | 可以 |
| 创建、停用账号和删除留言 | 不可以 | 不可以 | 可以 |
| 修改本人密码 | 不可以 | 可以 | 可以 |

文章公开展示作者的**显示名称**。登录账号不随文章公开，账号列表只有管理员能读取。作者发布的文章立即公开，本版本没有草稿或审核队列。

公开注册默认关闭，个人博客建议保持关闭。如果需要访客自行注册，在服务器设置 `ALLOW_REGISTRATION=true` 并重启；登录页将出现注册表单。注册只会创建作者，不能注册管理员。必须先初始化站长账号，不能通过公开页面抢占第一个管理员。

### 本地配置（可选）

复制模板后填写本地设置：

```powershell
Copy-Item .env.example .env
node --env-file-if-exists=.env server/index.mjs
```

需要使用同一份配置创建账号时：

```powershell
node --env-file-if-exists=.env scripts/account.mjs
```

直接运行 `node server/index.mjs` 不自动读取 `.env`；上述启动命令会读取。若 npm 可用，也可使用 `npm start` / `npm run account:init`。真实 `.env` 已被排除上传，`.env.example` 仅含公开模板。

## 2. 安全地上传 GitHub

### 不熟悉 Git：用项目提供的源码包

在项目目录执行：

```powershell
pwsh -File scripts/package-source.ps1
```

程序会输出一个 `exports/source-日期-随机标识/` 文件夹及对应 ZIP。该文件夹仅包含发布所需的源码、说明、部署配置和媒体，不包含真实环境配置、账号数据库、备份、旧 HTML 或原始 RAR。程序不会改动你的原文件。

1. 登录 GitHub，创建一个空仓库（首次建议选择 **Private**）。
2. 进入仓库，选择 **Add file → Upload files**。
3. 打开上面生成的源码文件夹，把**其中的文件和目录**拖入上传区域；不要上传整个父目录或 ZIP 本身。
4. 确认仓库根目录直接包含 `package.json`、`server/`、`public/`、`render.yaml`，以及 `.gitignore`、`.env.example`、`.github/`。
5. 检查上传列表，确认没有 `.env`、`data/`、`backups/`、`html.rar` 或旧 `html/*.html`，再提交。

不要把整个原项目目录拖到 GitHub 网页；网页上传不会替你执行 `.gitignore`。打包工具也不能识别你后来写进源码的任意密码，上传前仍需要浏览文件列表。

### 使用 Git 或 GitHub Desktop

也可以用 GitHub Desktop 把项目添加为仓库，然后检查 Changes 列表再发布。命令行方式如下（替换仓库地址）：

```powershell
git init
git add .
node scripts/check-upload.mjs
git diff --cached --stat
git diff --cached
git commit -m "Add account-based blog"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

不要把访问令牌放到仓库 URL 中。检查程序会检查已追踪文件中的禁止路径，以及源码中明显的私钥/GitHub 令牌；它不能识别所有秘密。GitHub Actions 也会运行上传检查和集成测试，但只能在提交已经到达 GitHub 后检查，不能替代本地审查。

**`.gitignore` 不会移除已经提交的敏感文件。** 如果以前上传过 `.env` 或数据库，先停止使用相应凭据、重置密码并撤销旧会话，然后处理 Git 历史；仅删除当前文件或把仓库改为私有，不能撤回已泄露的秘密。[GitHub 凭据泄露处理指南](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

原始 HTML 含历史生日、QQ、微信等信息，所以默认保留在本地，不上传。新站目前公开展示邮件与 Bilibili 链接；如不想公开，可在 `public/index.html` 和 `public/app.js` 修改。视频、图片版权归原作者，公开上线前请确认使用授权。

## 3. 从 GitHub 部署完整博客

### 推荐路径：Render Blueprint

此配置需要**付费 Web Service 与持久化磁盘**，请在平台确认费用后创建。不要将免费服务的临时文件系统作为账号和文章的正式存储；重启、重新部署可能丢失数据。详见 [Render 持久化磁盘说明](https://render.com/docs/disks)。

1. 登录 Render，选择 **New → Blueprint**，连接刚才的 GitHub 仓库。只授权需要的仓库。
2. Render 读取根目录 `render.yaml`，创建 Node.js 服务和挂载于 `/var/data` 的磁盘。
3. 根据提示，在 **Render 的密钥/环境变量表单**填入你选择的 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`。不要写入 `render.yaml` 或提交到 GitHub。`ADMIN_DISPLAY_NAME` 是公开作者名，可按需调整。
4. 确认服务和磁盘费用，再启动部署。健康检查地址为 `/api/health`。
5. 部署完成后打开平台给出的 `https://…onrender.com`，访问 `/admin` 登录。
6. **首次成功登录后**，从服务的环境变量中移除 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`，保存并重新部署；数据库里已经存有密码哈希，后续不再需要这两个变量。
7. 再次确认能登录、创建文章、刷新查看文章；重新部署后也应能读到原内容。

管理员环境变量**只在用户表为空时初始化**，不会在重启时覆盖已有密码。若忘记密码，请用后面的服务器重置命令；不要依赖修改环境变量来重置。

自动域名下，程序从 `RENDER_EXTERNAL_HOSTNAME` 确定可信 HTTPS 来源。如果绑定自己的域名，在 Render 增加 `PUBLIC_ORIGIN=https://你的域名`（无末尾斜杠和路径）并重新部署；之后请从该域名访问和登录。不要同时把多个域名混作写入来源。

源代码更新推送 GitHub 后可触发重新部署；线上文章、账号、留言保存在持久化磁盘上，并不写回 GitHub。本地 `data/` 不会被上传，因此首次云端部署只含初始示例文章，不会自动迁移你本地新增的文章或账号。

如果想把本地数据迁到云端：先备份，再通过平台支持的私密文件传输方式，在停止服务或维护期间替换 `/var/data/blog.sqlite`；使用相同数据库时登录密码也随之迁移。不要通过公开仓库传输数据库。

官方参考：[Web Service](https://render.com/docs/web-services)、[环境变量与密钥](https://render.com/docs/configure-environment-variables)、[Blueprint 配置](https://render.com/docs/blueprint-spec)。

### 其他服务器或 Docker

已提供 `Dockerfile`。服务器需要 HTTPS 反向代理、持久化卷和运行时环境变量。镜像只复制公开源码和媒体，不包含 `.env` 或数据库；容器默认以非 root 用户运行。挂载目录须允许容器中的 `node` 用户写入。

生产部署必须设置 `NODE_ENV=production` 和可信 HTTPS 来源 `PUBLIC_ORIGIN`（Render 自动域名除外），程序强制启用 Secure Cookie。不设置正确 HTTPS 来源或显式关闭安全 Cookie 时会拒绝启动。不要在没有 HTTPS 的公网服务器上使用开发模式。

本项目适合单实例服务。SQLite 存储在持久化磁盘，不适合直接放到临时磁盘的函数式托管或多个独立实例中；如要采用这些平台，需要改用外部数据库。

## 4. 已有安全措施与边界

- 没有默认管理员或硬编码登录凭据。首次初始化使用终端或托管平台密钥。
- 密码使用随机盐的 scrypt 哈希（N=32768、r=8、p=3，[OWASP 参数参考](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt)）；密码不会返回前端，服务器不记录登录请求内容。
- 登录 Cookie 为 HttpOnly / SameSite=Strict；生产环境为 Secure。浏览器不在 localStorage 保存密码或登录令牌。
- 会话有效期 12 小时，数据库仅保存令牌哈希。退出只撤销当前会话；修改/重置密码会撤销该账号全部会话，停用账号也立即撤销会话。
- 后台写入要求匹配会话的 CSRF 校验值，并检查请求来源、JSON 格式与权限。不能通过提交 `author_id` 或 `role` 伪造文章归属或注册管理员。
- 登录按来源地址及账号限制次数；公开注册与留言有限流。反向代理下默认使用连接地址，可能对多名访客共用限制；不信任任意转发 IP 请求头。限流保存在进程内，重启后重置，不替代平台防护。
- 数据库操作使用绑定参数；内容按文本转义，正文不执行任意 HTML。响应包含 CSP、禁止被嵌入、生产 HTTPS 策略等头。
- 数据库、备份和私有配置无静态访问入口；旧站只提供图片、视频目录中的资源。

这些措施降低风险，不承诺绝对安全。管理员仍能创建其他管理员，只应把管理员角色交给可信的人。当前没有邮箱验证、双因素认证、密码找回邮件、审核队列或审计日志；开放注册的作者可立即发文，个人站点建议关闭注册。

## 5. 备份与忘记密码

### 备份（不需要停止服务）

```powershell
node --env-file-if-exists=.env scripts/backup.mjs
```

采用 SQLite 在线备份接口，结果放在 `backups/`，可通过 `BACKUP_DIR` 改位置。云服务器上要确保 `DATA_DIR=/var/data`，并定期把备份**私密下载到其他位置**。备份包含密码哈希和会话数据，不能上传 GitHub，也不能仅依赖同一磁盘保存。

恢复时先停止服务，将选定备份复制为数据目录的 `blog.sqlite`；妥善处理旧数据库和 `-wal` / `-shm` 配套文件，再启动。建议在私密副本中先验证，不要把不同版本的 WAL 文件混用。

### 忘记密码

只有能访问服务器终端的人可以执行：

```powershell
node --env-file-if-exists=.env scripts/account.mjs --reset-password
```

输入现有账号和新密码；不会更改角色、启用状态或文章归属，全部旧会话失效。Render Shell 中使用 `node scripts/account.mjs --reset-password`，服务环境中的 `DATA_DIR` 会自动生效。没有公开密码重置接口。

## 6. 配置一览

| 环境变量 | 用途 |
| --- | --- |
| `HOST` / `PORT` | 默认 `127.0.0.1` / `3000`；平台监听用 `0.0.0.0`，端口通常由平台提供 |
| `DATA_DIR` | 默认项目 `data/`；线上为持久化磁盘 `/var/data` |
| `NODE_ENV` | 本地开发；线上必须为 `production` |
| `PUBLIC_ORIGIN` | 唯一可信 HTTPS 域名，不带末尾斜杠；Render 自动域名可自动推导 |
| `COOKIE_SECURE` | 本地默认关闭；线上强制开启 |
| `ALLOW_REGISTRATION` | 默认关闭；只有精确设为 `true` 才允许注册作者 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 仅首次空用户表初始化；成功后从托管平台删除 |
| `ADMIN_DISPLAY_NAME` | 首次管理员公开显示名称，默认「站长」 |
| `BACKUP_DIR` | 备份脚本的输出目录，默认 `backups/` |

## 7. 文件与检查

- `public/`：页面、样式、阅读界面和账号后台。
- `server/index.mjs`：HTTP 服务、文章/留言/账号接口和权限。
- `server/auth.mjs`：密码哈希、会话、账号校验。
- `server/db.mjs`：数据库与兼容旧版的结构迁移。
- `server/seed.mjs`：首次运行的文章与资源。修改它不会覆盖已有内容。
- `scripts/`：初始化/重置账号、私密备份、上传检查和源码打包。
- `render.yaml` / `Dockerfile`：部署模板。
- `.github/workflows/check.yml`：自动检查，没有部署密钥。

```powershell
node --test tests/*.test.mjs
node scripts/check-upload.mjs
```

集成检查使用独立临时数据库，不修改实际博客数据，覆盖旧结构迁移、鉴权、作者归属、管理员权限、密码修改与会话撤销、关闭/开启注册、跨站请求、登录限流、生产环境限制、视频与存储。

旧内容来自 2021 年原站记录，迁移说明为补写，不代表作者后来的真实经历；年龄按旧站历史记录描述。支持的正文语法为一级/二级标题、无序列表和围栏代码块，不是完整 Markdown。

设计参考 [Fuwari](https://github.com/saicaca/fuwari) 和 [Tailwind Nextjs Starter Blog](https://github.com/timlrx/tailwind-nextjs-starter-blog)，代码独立实现。
