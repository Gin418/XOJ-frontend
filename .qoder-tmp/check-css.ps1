$ErrorActionPreference = 'Stop'
$r = Invoke-WebRequest -Uri 'http://localhost:8081/' -UseBasicParsing
$html = $r.Content
$jsFiles = [regex]::Matches($html, 'src="([^"]+\.js)"') | ForEach-Object { $_.Groups[1].Value }
Write-Output "JS files: $($jsFiles -join ', ')"
foreach ($js in $jsFiles) {
  $url = 'http://localhost:8081' + $js
  $content = (Invoke-WebRequest -Uri $url -UseBasicParsing).Content
  if ($content -match '540px') {
    Write-Output "FOUND 540px in $js"
  } elseif ($content -match 'max-width:480px' -or $content -match '480px') {
    Write-Output "found 480px in $js"
  }
}
Write-Output 'done'
