Set-Location "C:\Users\WizTech\.gemini\antigravity\scratch\animated-shorts"
$remoteUrl = git remote get-url origin
if ($remoteUrl -match "x-access-token:([^@]+)@") {
  $token = $Matches[1]
} else {
  Write-Error "No token found in git remote origin"
  exit 1
}

$headers = @{
  "Authorization" = "Bearer $token"
  "Accept" = "application/vnd.github+json"
  "User-Agent" = "Antigravity"
}

$runs = Invoke-RestMethod -Uri "https://api.github.com/repos/moonis2006/animated-shorts/actions/runs?per_page=5" -Headers $headers
$latest = $runs.workflow_runs | Select-Object -First 1
Write-Output "Latest Cloud Run ID: $($latest.id) | Status: $($latest.status) | Conclusion: $($latest.conclusion)"
Write-Output "URL: $($latest.html_url)"

if ($latest.status -eq "completed" -and $latest.conclusion -eq "success") {
  $arts = Invoke-RestMethod -Uri "https://api.github.com/repos/moonis2006/animated-shorts/actions/runs/$($latest.id)/artifacts" -Headers $headers
  foreach ($art in $arts.artifacts) {
    New-Item -ItemType Directory -Force -Path "out\cloud" | Out-Null
    $zipPath = "out\cloud\$($art.name).zip"
    Write-Output "Downloading $($art.name) from GitHub Cloud..."
    Invoke-WebRequest -Uri $art.archive_download_url -Headers $headers -OutFile $zipPath
    Expand-Archive -Path $zipPath -DestinationPath "out\cloud" -Force
    Remove-Item $zipPath -Force
    Write-Output "Downloaded and extracted to out\cloud\"
  }
  Get-ChildItem "out\cloud"
}
