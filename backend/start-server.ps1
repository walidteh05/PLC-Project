$ErrorActionPreference = "Stop"

$candidates = @(
  "$env:LOCALAPPDATA\Programs\Python\Python*-32\python.exe",
  "C:\Program Files (x86)\Python*\python.exe"
)

$python32 = Get-ChildItem -Path $candidates -ErrorAction SilentlyContinue |
  Where-Object {
    (& $_.FullName -c "import struct; print(struct.calcsize('P') * 8)").Trim() -eq "32"
  } |
  Select-Object -First 1

if ($null -eq $python32) {
  throw "MX Component requires a 32-bit Python installation. Install 32-bit Python, then run npm run dev:backend again."
}

& $python32.FullName "$PSScriptRoot\server.py"
