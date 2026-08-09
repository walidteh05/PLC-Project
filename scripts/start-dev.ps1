$ErrorActionPreference = "Stop"

function Test-GatewayRunning {
  $client = [System.Net.Sockets.TcpClient]::new()

  try {
    $client.Connect("127.0.0.1", 5000)
    return $true
  }
  catch {
    return $false
  }
  finally {
    $client.Dispose()
  }
}

function Test-PortAvailable([int]$Port) {
  $client = [System.Net.Sockets.TcpClient]::new()

  try {
    $client.Connect("127.0.0.1", $Port)
    return $false
  }
  catch {
    return $true
  }
  finally {
    $client.Dispose()
  }
}

if (-not (Test-GatewayRunning)) {
  $backendScript = Join-Path $PSScriptRoot "..\backend\start-server.ps1"
  Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $backendScript
  ) -WindowStyle Hidden

  $deadline = (Get-Date).AddSeconds(10)
  do {
    Start-Sleep -Milliseconds 250
    if (Test-GatewayRunning) {
      break
    }
  } while ((Get-Date) -lt $deadline)

  if (-not (Test-GatewayRunning)) {
    throw "MX Gateway did not start. Run npm run dev:backend to view the startup error."
  }
}

$next = Join-Path $PSScriptRoot "..\node_modules\.bin\next.cmd"
$nextPort = 3000
while (-not (Test-PortAvailable $nextPort)) {
  $nextPort++
}

Write-Host "Starting Next.js on port $nextPort"
& $next dev --port $nextPort
