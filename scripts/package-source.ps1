# 只打包可发布的文件，不读取本地密码、数据库或旧 HTML。
$ErrorActionPreference = 'Stop'
$sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$exportRoot = Join-Path $sourceRoot 'exports'
New-Item -ItemType Directory -Force -Path $exportRoot | Out-Null
$stagePath = Join-Path $exportRoot ('source-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,6))
New-Item -ItemType Directory -Path $stagePath | Out-Null
$sourceFiles = @('package.json','README.md','.gitignore','.dockerignore','.env.example','Dockerfile','render.yaml')
foreach ($file in $sourceFiles) { Copy-Item -LiteralPath (Join-Path $sourceRoot $file) -Destination (Join-Path $stagePath $file) }
$folders = @('server','public','scripts','tests','docs','.github','html/images','html/videos')
foreach ($folder in $folders) {
    $folderRoot = Join-Path $sourceRoot $folder
    $items = Get-ChildItem -LiteralPath $folderRoot -File -Recurse -Force
    foreach ($item in $items) {
        if ($item.Extension -notin @('.md','.mjs','.js','.css','.html','.ps1','.yml','.yaml','.jpg','.png','.ico','.cur','.mp4')) { continue }
        $relativePath = [IO.Path]::GetRelativePath($sourceRoot, $item.FullName)
        $destination = Join-Path $stagePath $relativePath
        New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($destination)) | Out-Null
        Copy-Item -LiteralPath $item.FullName -Destination $destination
    }
}
# 使用 .NET 保留 .gitignore / .github 等点文件。
$zipPath = $stagePath + '.zip'
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($stagePath,$zipPath)
Write-Output ('可上传文件夹：' + $stagePath)
Write-Output ('备份压缩包：' + $zipPath)
Write-Output '上传解压后的文件，而不是 ZIP 本身。真实密钥请只填写到托管平台。'
