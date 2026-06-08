param(
  [object]$KillStale = $true,
  [object]$ClearNext = $true
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

function Convert-ToFlag($Value, [bool]$Default) {
  if ($null -eq $Value) { return $Default }
  if ($Value -is [bool]) { return $Value }
  $text = ([string]$Value).Trim().ToLowerInvariant()
  if ($text -in @("1", "true", "yes", "on", "`$true")) { return $true }
  if ($text -in @("0", "false", "no", "off", "`$false")) { return $false }
  return $Default
}

$KillStale = Convert-ToFlag $KillStale $true
$ClearNext = Convert-ToFlag $ClearNext $true

function Write-Info($Message) {
  Write-Host "[sarva] $Message"
}

function Normalize-Text($Value) {
  if ($null -eq $Value) { return "" }
  return ([string]$Value).ToLowerInvariant().Replace("\", "/")
}

function Get-ListeningPortOwners([int]$Port) {
  $owners = @()

  try {
    $owners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique)
  } catch {
    $owners = @()
  }

  if ($owners.Count -eq 0) {
    $lines = & netstat -ano -p tcp 2>$null
    foreach ($line in $lines) {
      if ($line -notmatch "\bLISTENING\b") { continue }
      $parts = $line.Trim() -split "\s+"
      if ($parts.Count -lt 5) { continue }
      $local = $parts[1]
      $pidText = $parts[$parts.Count - 1]
      $lastColon = $local.LastIndexOf(":")
      if ($lastColon -lt 0) { continue }
      $localPort = 0
      $ownerPid = 0
      if ([int]::TryParse($local.Substring($lastColon + 1), [ref]$localPort) -and [int]::TryParse($pidText, [ref]$ownerPid) -and $localPort -eq $Port) {
        $owners += $ownerPid
      }
    }
  }

  return @($owners | Sort-Object -Unique)
}

function Get-ProcessDetail([int]$ProcessId) {
  try {
    return Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop
  } catch {
    try {
      $process = Get-Process -Id $ProcessId -ErrorAction Stop
      return [pscustomobject]@{
        ProcessId = $process.Id
        Name = $process.ProcessName
        CommandLine = $null
      }
    } catch {
      return $null
    }
  }
}

function Get-ListeningPortsForProcess([int]$ProcessId) {
  $ports = @()
  $lines = & netstat -ano -p tcp 2>$null
  foreach ($line in $lines) {
    if ($line -notmatch "\bLISTENING\b") { continue }
    $parts = $line.Trim() -split "\s+"
    if ($parts.Count -lt 5) { continue }
    $pidText = $parts[$parts.Count - 1]
    $ownerPid = 0
    if (-not [int]::TryParse($pidText, [ref]$ownerPid) -or $ownerPid -ne $ProcessId) { continue }
    $local = $parts[1]
    $lastColon = $local.LastIndexOf(":")
    if ($lastColon -lt 0) { continue }
    $localPort = 0
    if ([int]::TryParse($local.Substring($lastColon + 1), [ref]$localPort)) {
      $ports += $localPort
    }
  }

  return @($ports | Sort-Object -Unique)
}

function Test-SarvaStaleProcess($Process, [int]$Port) {
  if ($null -eq $Process) { return $false }
  if ($Process.ProcessId -eq $PID) { return $false }

  $command = Normalize-Text $Process.CommandLine
  $name = Normalize-Text $Process.Name
  $rootText = Normalize-Text $Root
  $fromThisWorkspace = $command.Contains($rootText)
  $isNodeLike = $name -match "node|next|cmd|powershell" -or $command -match "node|next"
  $isLauncher = $command.Contains("scripts/https-dev-server.mjs")
  $isNextDev = $command.Contains("next") -and $command.Contains("dev") -and (
    $command.Contains("--port $Port") -or
    $command.Contains("--port=$Port") -or
    $command.Contains(" -p $Port") -or
    $command.Contains(":$Port")
  )
  $listeningPorts = @(Get-ListeningPortsForProcess $Process.ProcessId)
  $ownsCurrentPort = $listeningPorts -contains $Port
  $ownsSarvaCompanionPort = @($primaryHttpsPort, 3080, 3081, 3082, 3443 | Where-Object { $_ -ne $Port -and ($listeningPorts -contains $_) }).Count -gt 0
  $isLikelyPreviousLauncher = [string]::IsNullOrWhiteSpace($command) -and $isNodeLike -and $ownsCurrentPort -and $ownsSarvaCompanionPort

  return $isNodeLike -and ($isLauncher -or $fromThisWorkspace -or $isNextDev -or $isLikelyPreviousLauncher)
}

function Describe-Process($Process, [int]$ProcessId) {
  if ($null -eq $Process) { return "PID $ProcessId" }
  $name = if ($Process.Name) { $Process.Name } else { "process" }
  return "PID $($Process.ProcessId) $name"
}

function Stop-StaleProcess($Process) {
  if ($null -eq $Process) { return }
  Write-Info "Cleaning stale process: $(Describe-Process $Process $Process.ProcessId)"
  $taskkillExitCode = Invoke-Taskkill $Process.ProcessId
  if ($taskkillExitCode -ne 0) {
    try {
      Stop-Process -Id $Process.ProcessId -Force -ErrorAction Stop
    } catch {
      Write-Info "Could not stop PID $($Process.ProcessId). Run this file from the same user session, close that process manually, or use an elevated terminal."
    }
  }
}

function Invoke-Taskkill([int]$ProcessId) {
  $hadNativePreference = Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue
  $previousNativePreference = if ($hadNativePreference) { $global:PSNativeCommandUseErrorActionPreference } else { $null }

  try {
    if ($hadNativePreference) {
      $global:PSNativeCommandUseErrorActionPreference = $false
    }
    & taskkill.exe /PID $ProcessId /T /F *> $null
    return $LASTEXITCODE
  } catch {
    return 1
  } finally {
    if ($hadNativePreference) {
      $global:PSNativeCommandUseErrorActionPreference = $previousNativePreference
    }
  }
}

function Test-PortFree([int]$Port) {
  $listener = $null
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($null -ne $listener) { $listener.Stop() }
  }
}

function Clear-NextDirectorySafely {
  $nextPath = Join-Path $Root ".next"
  if (-not (Test-Path -LiteralPath $nextPath)) {
    Write-Info ".next cache is already clear."
    return
  }

  $resolved = (Resolve-Path -LiteralPath $nextPath).Path
  $insideRoot = $resolved.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)
  $isNextDir = (Split-Path -Leaf $resolved) -eq ".next"
  if (-not ($insideRoot -and $isNextDir)) {
    throw "Refusing to clear unexpected path: $resolved"
  }

  try {
    Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction Stop
    Write-Info "Cleared stale .next cache."
  } catch {
    Write-Host "[sarva] Warning: .next could not be cleared. Close any running Next process if startup is slow."
  }
}

Write-Info "Project: $Root"

$sarvaProcesses = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
  $name = Normalize-Text $_.Name
  $cmd = Normalize-Text $_.CommandLine
  ($name -match "node|next|npm|cmd") -and ($cmd.Contains((Normalize-Text $Root)) -or $cmd.Contains("https-dev-server.mjs"))
})

if ($sarvaProcesses.Count -gt 0) {
  Write-Info "Found $($sarvaProcesses.Count) Nammude-related Node/Next process(es)."
} else {
  Write-Info "No Nammude-related Node/Next process is currently running."
}

$primaryHttpsPort = 3000
if ($env:SARVA_HTTPS_PORT) {
  [void][int]::TryParse($env:SARVA_HTTPS_PORT, [ref]$primaryHttpsPort)
}

$portsToCheck = @((3000..3010) + 3080 + 3081 + 3082 + 3443) | Sort-Object -Unique
$fatalLocks = @()

foreach ($port in $portsToCheck) {
  $owners = @(Get-ListeningPortOwners $port)
  if ($owners.Count -eq 0 -and (Test-PortFree $port)) {
    Write-Info "Port $port is free."
    continue
  }

  $descriptions = @()
  $processes = @()
  foreach ($ownerPid in $owners) {
    $process = Get-ProcessDetail $ownerPid
    $processes += $process
    $descriptions += Describe-Process $process $ownerPid
  }

  $stale = @($processes | Where-Object { Test-SarvaStaleProcess $_ $port })
  if ($KillStale -and $stale.Count -gt 0) {
    foreach ($process in $stale) { Stop-StaleProcess $process }
    Start-Sleep -Milliseconds 700
    if (Test-PortFree $port) {
      Write-Info "Port $port is free after cleanup."
      continue
    }
  }

  Write-Info "Port $port is in use by: $($descriptions -join ', ')"
  if ($port -eq $primaryHttpsPort) {
    $fatalLocks += "HTTPS port $port is blocked by $($descriptions -join ', ')"
  }
}

if ($fatalLocks.Count -gt 0) {
  Write-Host ""
  Write-Host "Startup cannot continue:"
  foreach ($item in $fatalLocks) { Write-Host " - $item" }
  Write-Host "Next action: close that process, rerun with SARVA_KILL_STALE=1, or set SARVA_HTTPS_PORT to a free port."
  exit 2
}

if ($ClearNext) {
  Clear-NextDirectorySafely
} else {
  Write-Info "Skipping .next cleanup because SARVA_CLEAR_NEXT is disabled."
}

Write-Info "Preflight complete. The HTTPS launcher will choose the internal Next.js port."
