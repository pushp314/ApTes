# ==============================================================================
# 🛡️ Sentinel Smart Interactive Setup & Environment Doctor (Windows PowerShell)
# Cross-Platform Environment Doctor & Automated Dependency Provisioner
# ==============================================================================

Clear-Host

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  🛡️  Sentinel Interactive Setup & Environment Doctor" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Checking system prerequisites and dependencies..." -ForegroundColor Yellow
Write-Host ""

# 1. Check Git
if (Get-Command git -ErrorAction SilentlyContinue) {
    $gitVer = git --version
    Write-Host "  ✅ Git: $gitVer" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Git is not detected." -ForegroundColor Yellow
    $installGit = Read-Host "  Install Git via winget? [y/N]"
    if ($installGit -match "^[Yy]") {
        winget install --id Git.Git -e --source winget
    }
}

# 2. Check Python 3
$hasPython = $false
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pyVer = python --version
    Write-Host "  ✅ Python 3: $pyVer" -ForegroundColor Green
    $hasPython = $true
} else {
    Write-Host "  ⚠️  Python 3 not detected." -ForegroundColor Yellow
    $installPy = Read-Host "  Install Python 3 via winget? [y/N]"
    if ($installPy -match "^[Yy]") {
        winget install --id Python.Python.3.12 -e --source winget
        $hasPython = $true
    }
}

# 3. Check Node.js
$hasNode = $false
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = node -v
    Write-Host "  ✅ Node.js: $nodeVer" -ForegroundColor Green
    $hasNode = $true
} else {
    Write-Host "  ⚠️  Node.js is not detected." -ForegroundColor Yellow
    $installNode = Read-Host "  Install Node.js (LTS) via winget? [y/N]"
    if ($installNode -match "^[Yy]") {
        winget install --id OpenJS.NodeJS.LTS -e --source winget
        $hasNode = $true
    }
}

# 4. Build Workspace
Write-Host ""
Write-Host "Installing dependencies and building packages..." -ForegroundColor Cyan

if ($hasNode) {
    npm install
    npm run build
    Write-Host "  ✅ Built all packages successfully!" -ForegroundColor Green

    # Setup PATH
    $InstallDir = "$env:USERPROFILE\.sentinel\bin"
    if (!(Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }
    $CmdContent = "@echo off`nnode `"%~dp0..\..\packages\platform\dist\cli.js`" %*"
    Set-Content -Path "$InstallDir\sentinel.cmd" -Value $CmdContent

    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($UserPath -notlike "*$InstallDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
        Write-Host "  ✅ Added sentinel to User PATH" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  🎉 Sentinel Setup Complete on Windows!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "What would you like to launch right now?"
Write-Host "  [1] 🌐 Launch Web Mission Control GUI (http://localhost:3333)" -ForegroundColor Cyan
Write-Host "  [2] 💻 Launch Interactive Terminal Dashboard (TUI)" -ForegroundColor Cyan
Write-Host "  [3] 📖 Launch Documentation Website (http://localhost:5173)" -ForegroundColor Cyan
Write-Host "  [4] 🚪 Exit" -ForegroundColor Cyan
Write-Host ""

$launchChoice = Read-Host "Select option [1-4] (default: 1)"
if ([string]::IsNullOrWhiteSpace($launchChoice)) { $launchChoice = "1" }

if ($launchChoice -eq "1") {
    Write-Host "`n🚀 Starting Sentinel Web Mission Control on http://localhost:3333..." -ForegroundColor Green
    node packages/platform/dist/cli.js ui
} elseif ($launchChoice -eq "2") {
    python packages/sentinel-py/sentinel.py dashboard
} elseif ($launchChoice -eq "3") {
    Write-Host "`n📖 Starting VitePress documentation server..." -ForegroundColor Green
    npm run docs
} else {
    Write-Host "`nSetup complete! Run 'sentinel dashboard' or 'sentinel ui' anytime.`n" -ForegroundColor Green
}
