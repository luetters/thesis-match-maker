# GitHub-unabhängiger, manuell ausgelöster Windows-Deploy für den eingeschränkten VPS-Zugang.
param(
  [Parameter(Mandatory = $true)]
  [string]$ArchivePath,
  [string]$HostName = "217.154.124.8",
  [string]$UserName = "thesis-deploy",
  [string]$PrivateKeyPath = "$env:USERPROFILE\.ssh\thesis-match-deploy"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ArchivePath)) {
  throw "Releasearchiv nicht gefunden: $ArchivePath"
}

if (-not (Test-Path -LiteralPath $PrivateKeyPath)) {
  throw "Privater Deploy-Schlüssel nicht gefunden: $PrivateKeyPath"
}

Write-Host "Übertrage geprüftes Releasearchiv..."
& scp -O -i $PrivateKeyPath $ArchivePath "$UserName@$HostName`:incoming/thesis-source.zip"
if ($LASTEXITCODE -ne 0) { throw "Übertragung fehlgeschlagen." }

Write-Host "Starte kontrollierten Deploy..."
& ssh -i $PrivateKeyPath "$UserName@$HostName" deploy
if ($LASTEXITCODE -ne 0) { throw "Deploy oder Health-Check fehlgeschlagen." }

Write-Host "Deploy erfolgreich abgeschlossen."
