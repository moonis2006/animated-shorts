param(
  [string]$Composition = "BridgeShort",
  [string]$Mode = "clip_5s",
  [string]$Scale = "0.6667"
)

Set-Location "C:\Users\WizTech\.gemini\antigravity\scratch\animated-shorts"
$remoteUrl = git remote get-url origin
if ($remoteUrl -match "x-access-token:([^@]+)@") {
  $token = $Matches[1]
} else {
  Write-Error "No token found in git remote origin"
  exit 1
}

git add -A
git commit -m "Update animation for cloud render ($Composition - $Mode)" 2>$null
git push origin main
git push origin main:render --force

Write-Output "Triggered cloud render on GitHub! Check status at: https://github.com/moonis2006/animated-shorts/actions"
