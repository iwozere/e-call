# Build SPA for Pi deploy (Windows). Run from infra\pi after copying .env.example → .env
$ErrorActionPreference = "Stop"
$Dir = $PSScriptRoot
$Root = (Resolve-Path (Join-Path $Dir "..\..")).Path

$envFile = Join-Path $Dir ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        $i = $_.IndexOf("=")
        if ($i -lt 1) { return }
        $k = $_.Substring(0, $i).Trim()
        $v = $_.Substring($i + 1).Trim()
        [Environment]::SetEnvironmentVariable($k, $v, "Process")
    }
}

if (-not $env:VITE_API_BASE_URL) {
    throw "Set VITE_API_BASE_URL in infra\pi\.env (e.g. https://call.example.com)"
}

Push-Location $Root
try {
    npm run build -w frontend
} finally {
    Pop-Location
}

$html = Join-Path $Dir "html"
New-Item -ItemType Directory -Force -Path $html | Out-Null
Get-ChildItem $html -Force | Where-Object { $_.Name -ne ".gitkeep" } | Remove-Item -Recurse -Force
Copy-Item -Path (Join-Path $Root "frontend\dist\*") -Destination $html -Recurse -Force
Write-Host "Copied to $html"
