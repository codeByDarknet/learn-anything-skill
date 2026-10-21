# studio.ps1 — open the course in the browser (lessons, exercises, terminal, grading, progress).
# Lives at the course root, next to studio\.
#
#   .\studio.ps1                start the Studio and open http://localhost:<port>
#   .\studio.ps1 -Service       start it by itself at every login (shortcut in the Startup folder)
#   .\studio.ps1 -StopService   remove that shortcut and stop the Studio
#   .\studio.ps1 -Check         validate the course for the Studio (manifest, files, quizzes) and exit
#
# Port: $env:STUDIO_PORT, else studio\studio.json {"port": N}, else 4242.
param([switch]$Service, [switch]$StopService, [switch]$Check)
$ErrorActionPreference = 'Stop'

$Root = $PSScriptRoot
$Studio = Join-Path $Root 'studio'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error 'Node.js 20+ is required: https://nodejs.org (or: winget install OpenJS.NodeJS.LTS)'
  exit 1
}

function Read-Json($file) {
  if (Test-Path $file) { try { return Get-Content $file -Raw | ConvertFrom-Json } catch {} }
  return $null
}
$cfg = Read-Json (Join-Path $Studio 'studio.json')
$course = Read-Json (Join-Path $Root '.learn\course.json')
$Port = if ($env:STUDIO_PORT) { $env:STUDIO_PORT } elseif ($cfg -and $cfg.port) { "$($cfg.port)" } else { '4242' }
$Slug = if ($course -and $course.params -and $course.params.slug) { $course.params.slug } else { 'course' }
$Url = "http://localhost:$Port"
$Shortcut = Join-Path ([Environment]::GetFolderPath('Startup')) "learn-studio-$Slug.lnk"

function Install-Deps {
  if (-not (Test-Path (Join-Path $Studio 'node_modules\node-pty'))) {
    Write-Host 'Installing the Studio dependencies (once)...'
    Push-Location $Studio
    try { npm install --no-fund --no-audit; if ($LASTEXITCODE) { throw 'npm install failed' } } finally { Pop-Location }
  }
}

function Test-Running {
  try { Invoke-WebRequest "$Url/api/state" -UseBasicParsing -TimeoutSec 2 | Out-Null; return $true } catch { return $false }
}

if ($Check) { Install-Deps; node (Join-Path $Studio 'server.js') --check; exit $LASTEXITCODE }

if ($StopService) {
  Remove-Item $Shortcut -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -like "*$Studio*server.js*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  Write-Host 'Auto-start removed and Studio stopped.'
  exit 0
}

if ($Service) {
  Install-Deps
  $node = (Get-Command node).Source
  $cmd = "`$env:STUDIO_PORT='$Port'; Set-Location '$Studio'; & '$node' server.js"
  $ws = New-Object -ComObject WScript.Shell
  $lnk = $ws.CreateShortcut($Shortcut)
  $lnk.TargetPath = 'powershell.exe'
  $lnk.Arguments = "-NoProfile -WindowStyle Hidden -Command `"$cmd`""
  $lnk.WorkingDirectory = $Studio
  $lnk.Save()
  if (-not (Test-Running)) { Start-Process powershell.exe -ArgumentList '-NoProfile', '-WindowStyle', 'Hidden', '-Command', $cmd -WindowStyle Hidden }
  Write-Host "Studio installed: it runs now and will start again at every login -> $Url"
  Start-Sleep -Seconds 2
  Start-Process $Url
  exit 0
}

Install-Deps
if (Test-Running) { Write-Host "The Studio is already running -> $Url"; Start-Process $Url; exit 0 }
$env:STUDIO_PORT = $Port
Start-Job -ScriptBlock { param($u) Start-Sleep -Seconds 1; Start-Process $u } -ArgumentList $Url | Out-Null
node (Join-Path $Studio 'server.js')
