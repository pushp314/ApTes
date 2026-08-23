# ==============================================================================
# Sentinel Cross-Platform Installer for Windows (PowerShell)
# Installs Sentinel CLI and registers PATH
# ==============================================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   🛡️  Installing Sentinel Security Platform on Windows" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$InstallDir = "$env:USERPROFILE\.sentinel\bin"
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Create sentinel.cmd launcher
$CmdContent = @"
@echo off
node "%~dp0..\..\packages\platform\dist\cli.js" %*
"@

Set-Content -Path "$InstallDir\sentinel.cmd" -Value $CmdContent

# Create sentinel-py.cmd launcher
$PyCmdContent = @"
@echo off
python "%~dp0..\..\packages\sentinel-py\sentinel.py" %*
"@

Set-Content -Path "$InstallDir\sentinel-py.cmd" -Value $PyCmdContent

# Add to User PATH if not present
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
    Write-Host "✓ Added $InstallDir to User PATH" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  ✅ Sentinel installed successfully on Windows!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "To get started, open a new PowerShell terminal and run:"
Write-Host "  sentinel dashboard    # Interactive Terminal Hub" -ForegroundColor Cyan
Write-Host "  sentinel ui           # Web Mission Control (http://localhost:3333)" -ForegroundColor Cyan
Write-Host ""
