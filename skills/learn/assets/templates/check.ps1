# tools/check.ps1 — grade exercises on native Windows PowerShell (5.1+ / 7+).
# Template from the `learn` skill. The agent adapts CONFIG and translates messages.
#
#   .\tools\check.ps1                                   # every exercise
#   .\tools\check.ps1 03-deployments                    # one module
#   .\tools\check.ps1 03-deployments\exercises\02-x     # one exercise
#   .\tools\check.ps1 capstone 03                       # capstone milestones 01..03
#
# Exercises that only ship a check.sh are run through bash (Git Bash or WSL) when available.

param([string]$Target = "", [string]$Milestone = "")

# ─── CONFIG ─────────────────────────────────────────────────────────────────
$NativeTestGlob = '*_test.go'
function Invoke-Native { go test ./... 2>&1 }
function Invoke-Milestone($m) {
  $ps = "capstone/tests/validate-$m.ps1"
  if (Test-Path $ps) { & $ps 2>&1 } else { bash "capstone/tests/validate-$m.sh" 2>&1 }
}
# ─── MESSAGES ───────────────────────────────────────────────────────────────
$MsgChecking = "Checking"; $MsgPass = "PASS"; $MsgFail = "FAIL"; $MsgTodo = "To work on"
$MsgAllGreen = "All checks pass!"; $MsgNone = "No exercise found in"
# ────────────────────────────────────────────────────────────────────────────

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
New-Item -ItemType Directory -Force -Path ".learn" | Out-Null
$Log = Join-Path $Root ".learn/results.log"
$script:Total = 0; $script:Passed = 0; $script:Failed = @()

function Write-Result($label, $ok, $output) {
  $script:Total++
  if ($ok) { Write-Host ("  {0,-60} " -f $label) -NoNewline; Write-Host "✓ $MsgPass" -ForegroundColor Green; $script:Passed++ }
  else {
    Write-Host ("  {0,-60} " -f $label) -NoNewline; Write-Host "✗ $MsgFail" -ForegroundColor Red
    $script:Failed += $label
    if ($output) { ($output | Out-String).Split("`n") | Select-Object -First 25 | ForEach-Object { Write-Host "      $_" } }
  }
}
function Add-Record($target, $ok) {
  $ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  Add-Content -Path $Log -Value ("{0}`t{1}`t{2}" -f $ts, $target, $(if ($ok) { "pass" } else { "fail" })) -Encoding UTF8
}
function Test-Exercise($dir) {
  (Test-Path (Join-Path $dir "check.ps1")) -or (Test-Path (Join-Path $dir "check.sh")) -or
  [bool](Get-ChildItem -Path $dir -Filter $NativeTestGlob -File -ErrorAction SilentlyContinue)
}
function Invoke-Exercise($dir) {
  Push-Location $dir
  try {
    if (Test-Path "check.ps1") { $out = & .\check.ps1 2>&1 }
    elseif (Test-Path "check.sh") { $out = bash ./check.sh 2>&1 }
    else { $out = Invoke-Native }
    return @{ Ok = ($LASTEXITCODE -eq 0); Out = $out }
  } finally { Pop-Location }
}
function Show-Summary {
  Write-Host ""; Write-Host "  Total: $script:Total   ✓ $script:Passed   ✗ $($script:Failed.Count)"
  if ($script:Failed.Count -gt 0) { Write-Host "$MsgTodo :" -ForegroundColor Yellow; $script:Failed | ForEach-Object { Write-Host "  - $_" }; exit 1 }
  if ($script:Total -gt 0) { Write-Host "  🎉 $MsgAllGreen" -ForegroundColor Green }
  exit 0
}

if ($Target -like "capstone*") {
  Write-Host "$MsgChecking : capstone $Milestone"
  Get-ChildItem "capstone/tests" -Filter "validate-*.sh" -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object {
    $m = ($_.BaseName -replace 'validate-', '')
    if ($Milestone -and [int]$m -gt [int]$Milestone) { return }
    $out = Invoke-Milestone $m; $ok = ($LASTEXITCODE -eq 0)
    Write-Result "capstone/$m" $ok $out; Add-Record "capstone/$m" $ok
  }
  Show-Summary
}

$search = if ($Target) { $Target } else { "." }
Write-Host "$MsgChecking : $(if ($Target) { $Target } else { '*' })"
$dirs = Get-ChildItem -Path $search -Directory -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.Parent.Name -eq "exercises" -or ($Target -like "*solutions*" -and $_.Parent.Name -eq "solutions") } |
  Where-Object { $_.FullName -notmatch '[\\/](node_modules|\.git|capstone|playground)[\\/]' } |
  Where-Object { Test-Exercise $_.FullName } | Sort-Object FullName
if ((Split-Path -Leaf (Split-Path -Parent (Resolve-Path $search))) -in @("exercises", "solutions") -and (Test-Exercise $search)) { $dirs = @(Get-Item $search) }

foreach ($d in $dirs) {
  $rel = (Resolve-Path -Relative $d.FullName).TrimStart('.', '\', '/') -replace '\\', '/'
  $r = Invoke-Exercise $d.FullName
  Write-Result $rel $r.Ok $r.Out
  if ($rel -notlike "*/solutions/*") { Add-Record $rel $r.Ok }
}
if ($script:Total -eq 0) { Write-Host "  $MsgNone $search" -ForegroundColor Yellow }
Show-Summary
