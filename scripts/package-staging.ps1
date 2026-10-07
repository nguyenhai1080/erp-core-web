param(
    [ValidateSet('api', 'web', 'all')][string]$Target = 'all'
)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$taskOutput = Join-Path $taskRoot "artifacts/staging/$taskStamp"
New-Item -ItemType Directory -Path $taskOutput -ErrorAction Stop | Out-Null

if ($Target -in @('api', 'all')) {
    $taskApi = Join-Path $taskOutput 'api'
    New-Item -ItemType Directory -Path "$taskApi/packages/db" | Out-Null
    Copy-Item -LiteralPath "$taskRoot/deploy/api/package.json", "$taskRoot/deploy/api/package-lock.json", "$taskRoot/deploy/api/start.mjs", "$taskRoot/deploy/api/storage-probe.mjs", "$taskRoot/tsconfig.base.json" -Destination $taskApi
    Copy-Item -LiteralPath "$taskRoot/apps/api/src" -Destination $taskApi -Recurse
    Copy-Item -LiteralPath "$taskRoot/packages/db/src", "$taskRoot/packages/db/prisma", "$taskRoot/packages/db/package.json", "$taskRoot/packages/db/tsconfig.json" -Destination "$taskApi/packages/db" -Recurse
    $taskTs = Get-Content "$taskRoot/apps/api/tsconfig.json" -Raw | ConvertFrom-Json
    $taskTs.extends = './tsconfig.base.json'
    $taskTs | ConvertTo-Json -Depth 10 | Set-Content "$taskApi/tsconfig.json" -Encoding utf8
    $taskDb = Get-Content "$taskApi/packages/db/package.json" -Raw | ConvertFrom-Json
    $taskDb.dependencies.'@prisma/client' = '6.19.3'
    $taskDb | ConvertTo-Json -Depth 10 | Set-Content "$taskApi/packages/db/package.json" -Encoding utf8
    Push-Location $taskApi
    try {
        # Create the upload archive before installation so it contains source only.
        Compress-Archive -Path package.json,package-lock.json,start.mjs,storage-probe.mjs,tsconfig.json,tsconfig.base.json,src,packages -DestinationPath "$taskOutput/erp-core-api-staging-upload.zip"
        & npm.cmd ci --ignore-scripts --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'API dependency installation failed' }
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw 'API bundle build failed' }
    } finally { Pop-Location }
}
if ($Target -in @('web', 'all')) {
    Push-Location $taskRoot
    try {
        & pnpm.cmd --filter '@erp/web' build
        if ($LASTEXITCODE -ne 0) { throw 'Web build failed' }
    } finally { Pop-Location }
    $taskWeb = Join-Path $taskOutput 'web'
    New-Item -ItemType Directory -Path $taskWeb | Out-Null
    Copy-Item -LiteralPath "$taskRoot/deploy/web/package.json", "$taskRoot/deploy/web/package-lock.json", "$taskRoot/deploy/web/server.mjs" -Destination $taskWeb
    Copy-Item -LiteralPath "$taskRoot/apps/web/dist" -Destination "$taskWeb/public" -Recurse
    Push-Location $taskWeb
    try {
        & node.exe --check server.mjs
        if ($LASTEXITCODE -ne 0) { throw 'Web server validation failed' }
        Compress-Archive -Path package.json,package-lock.json,server.mjs,public -DestinationPath "$taskOutput/erp-core-web-staging-upload.zip"
    } finally { Pop-Location }
}
Write-Output "Staging bundles: $taskOutput"
