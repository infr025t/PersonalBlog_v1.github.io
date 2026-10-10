# 一隅 · 000lll 的小站

现在优先作为个人阅读小站使用。账号和在线发帖已搁置，代码保留供以后继续开发；默认关闭账号接口，页面不再显示登录入口。旧站的点状动态背景已移植：小点缓慢移动、靠近时连线，鼠标附近会有轻微牵引。

## 本地查看

需要 Node.js 24 或更新版本，在项目目录运行：

```powershell
node server/index.mjs
```

打开 <http://127.0.0.1:3000>。文章与留言沿用本地数据库，停止时按 Ctrl+C。原 `html/` 和 `html.rar` 保留不动。

页脚的「动态背景：开/关」可以切换装饰，选择保存在当前浏览器。日间显示太阳图标，夜间显示月亮图标，按钮提示同步更新；选择会保存，未选择时跟随系统主题，刷新时也会预先应用主题。深色模式自动调整点线颜色；页面进入后台时暂停动画，系统启用减少动态效果时不播放。手机自动减少点数，不干扰点击或阅读。

## 发布到 GitHub Pages（纯静态，无需后端服务）

1. 在 GitHub 创建仓库，把项目源码上传，根目录应直接有 `package.json`、`public/`、`server/`、`scripts/` 和 `.github/`。
2. 进入仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
3. 将代码推送到 `main` 分支，或进入 **Actions → Deploy static blog to GitHub Pages → Run workflow** 手动运行。
4. 等待部署成功，从 **Settings → Pages** 打开给出的链接，通常为 `https://用户名.github.io/仓库名/`。

已准备 `.github/workflows/pages.yml`，它会导出公开文章、样式、脚本与媒体，不上传数据库或账号。部署使用平台提供的临时授权，不需要在源码中填写密码、访问令牌或管理员信息。流程须在你的 GitHub 仓库中运行；本地已经验证导出，尚未实际发布到 GitHub。

GitHub Pages 的可用性与仓库可见性受账号套餐限制：GitHub Free 可用于公开仓库；私有仓库需要相应付费套餐。公共站点中的文章、媒体、邮件和 Bilibili 链接都会公开，请确认愿意分享。[GitHub 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

### 不熟悉 Git：生成可上传源码包

```powershell
pwsh -File scripts/package-source.ps1
```

输出在 `exports/` 中。打开生成的 `source-日期-随机标识/` 文件夹，将**其中的文件和目录**通过 GitHub 的 **Add file → Upload files** 上传。不要上传整个原项目，也不要把 ZIP 本身当作网站上传。确保 `.github/workflows/pages.yml` 一并上传。

这个包不包含真实 `.env`、数据库、备份或包含历史个人信息的旧 HTML。`.gitignore` 也会排除这些文件，但网页手动上传不会自动执行忽略规则。

### 静态版有哪些功能？

保留首页、文章阅读、分类/标签筛选、搜索、归档、收藏、视频、深浅色模式与动态背景。使用 `#/post/文章短链接` 形式的地址，能直接刷新，也适配 `/仓库名/` 路径。

**静态版不支持登录、在线发帖或提交留言。** 留言页显示邮件联系方式，不会假装提交成功；本地服务器运行时，原有留言板仍可用。GitHub Actions 默认从 `server/seed.mjs` 构建，新增文章请编辑这个文件后提交；它不会读取你电脑里的 SQLite 数据库。

## 自己导出静态文件

```powershell
node scripts/build-static.mjs
```

结果在 `dist/`，可交给任意静态托管服务。默认导出本地数据库中的公开文章；没有数据库时使用 `server/seed.mjs`。只导出文章显示名称，不导出登录账号、密码哈希、会话、数据库或留言。

需要始终从源码中的文章构建时：

```powershell
node scripts/build-static.mjs --seed-only
```

预览导出结果，运行下面的命令，再打开 <http://127.0.0.1:4173>：

```powershell
python -m http.server 4173 --directory dist
```

需要本机已有 Python。也可以用任意本地静态文件服务器。不要直接双击 `index.html`，浏览器通常不允许从本地文件地址加载模块和 JSON。

每次导出会重建项目下的 `dist/`。请在源码或数据库中修改文章，不要直接修改导出文件。文章正文支持一级/二级标题、无序列表和代码块。

## 上传前检查

```powershell
node scripts/check-upload.mjs
node --test tests/*.test.mjs
```

检查只覆盖常见敏感路径和明显密钥模式，不能发现所有秘密。真实环境配置、数据库、数据库备份、私钥和旧 HTML 不应提交；不要在源码中填写管理员密码。若过去已上传敏感信息，仅添加 `.gitignore` 无法清除历史，需要轮换凭据并处理历史记录。

旧图片与视频归原作者所有，公开发布前请确认使用授权。新站公开的邮件与 Bilibili 链接可在 `public/index.html` 和 `public/app.js` 修改。

## 文件位置

- `public/background.js`：由旧 `html/js/js.js` 点线效果改写的背景模块。
- `public/`：页面与样式；`site-config.js` 区分服务端预览和静态导出。
- `server/seed.mjs`：GitHub Pages 使用的公开文章与资源。
- `scripts/build-static.mjs`：仅导出公开阅读内容。
- `.github/workflows/pages.yml`：GitHub Pages 自动构建与发布。
- `data/`：仅本地使用的数据库，不上传。
- `docs/accounts-and-server.md`：已搁置的账号与服务器部署参考。

设计参考 [Fuwari](https://github.com/saicaca/fuwari) 和 [Tailwind Nextjs Starter Blog](https://github.com/timlrx/tailwind-nextjs-starter-blog)。
