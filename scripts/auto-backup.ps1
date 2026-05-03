# Sauvegarde automatique - commit et push tout ce qui n'est pas encore sur GitHub
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\MOOKI\mysteria-app"

# Y a-t-il quelque chose a sauvegarder ?
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "Rien a sauvegarder."
    exit 0
}

# Stage tout
git add -A

# Commit avec timestamp
$date = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -m "Auto-backup $date"

# Push
git push origin main

# Tag
$tagName = "auto-backup-" + (Get-Date -Format "yyyyMMdd-HHmm")
git tag -a $tagName -m "Auto-backup $date"
git push origin $tagName

Write-Host "Sauvegarde reussie : $tagName"
