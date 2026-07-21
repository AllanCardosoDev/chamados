# CBMAM Chamados - Script de Correcao de Permissoes e Servico
# Execute como Administrador: Right-click > Run with PowerShell

$ROOT     = "C:\inetpub\vhosts\cbm.am.gov.br\chamados"
$BACKEND  = "$ROOT\backend"
$DIST     = "$ROOT\frontend\dist"
$APPPOOL  = "chamados-cbmam"
$SERVICE  = "chamados-backend"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  CBMAM Chamados - Correcao de Permissoes e Servico" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# --- 1. Permissoes IIS ---
Write-Host ""
Write-Host "[1/4] Corrigindo permissoes de leitura para o IIS..." -ForegroundColor Yellow

# Garante que IIS_IUSRS tem acesso de leitura
icacls $ROOT /grant "IIS_IUSRS:(OI)(CI)R" /T /T /Q 2>&1 | Out-Null
Write-Host "      IIS_IUSRS: OK" -ForegroundColor Green

# Garante que o App Pool identity tem acesso
icacls $ROOT /grant ("IIS AppPool\" + $APPPOOL + ":(OI)(CI)R") /T /Q 2>&1 | Out-Null
Write-Host "      IIS AppPool\$APPPOOL`: OK" -ForegroundColor Green

# Garante que IUSR tem acesso de leitura (acesso anonimo)
icacls $ROOT /grant "IUSR:(OI)(CI)R" /T /Q 2>&1 | Out-Null
Write-Host "      IUSR: OK" -ForegroundColor Green

# --- 2. App Pool ---
Write-Host ""
Write-Host "[2/4] Verificando App Pool do IIS..." -ForegroundColor Yellow
Import-Module WebAdministration -ErrorAction SilentlyContinue

$pool = Get-Item "IIS:\AppPools\$APPPOOL" -ErrorAction SilentlyContinue
if ($pool -eq $null) {
    Write-Host "      AVISO: App Pool '$APPPOOL' nao encontrado. Execute setup.ps1 primeiro." -ForegroundColor Red
} else {
    $state = $pool.State
    if ($state -eq "Stopped") {
        Start-WebAppPool -Name $APPPOOL
        Write-Host "      App Pool iniciado." -ForegroundColor Green
    } else {
        Restart-WebAppPool -Name $APPPOOL
        Write-Host "      App Pool reiniciado (estado anterior: $state)." -ForegroundColor Green
    }
}

# --- 3. Backend Service ---
Write-Host ""
Write-Host "[3/4] Verificando servico backend ($SERVICE)..." -ForegroundColor Yellow

$svc = Get-Service -Name $SERVICE -ErrorAction SilentlyContinue
if ($svc -eq $null) {
    Write-Host "      AVISO: Servico '$SERVICE' nao encontrado." -ForegroundColor Red
    Write-Host "      Tentando iniciar backend diretamente..." -ForegroundColor Yellow

    # Verifica se node esta disponivel
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd -ne $null) {
        $nssmCmd = Get-Command nssm -ErrorAction SilentlyContinue
        if ($nssmCmd -ne $null) {
            Write-Host "      Reinstalando servico NSSM..." -ForegroundColor Yellow
            $NODE = $nodeCmd.Source
            New-Item -ItemType Directory -Force -Path "$ROOT\logs" | Out-Null
            nssm install $SERVICE $NODE
            nssm set $SERVICE AppDirectory $BACKEND
            nssm set $SERVICE AppParameters "src/server.js"
            nssm set $SERVICE AppEnvironmentExtra "NODE_ENV=production"
            nssm set $SERVICE DisplayName "CBMAM Chamados Backend"
            nssm set $SERVICE Start SERVICE_AUTO_START
            nssm set $SERVICE AppStdout "$ROOT\logs\backend-stdout.log"
            nssm set $SERVICE AppStderr "$ROOT\logs\backend-stderr.log"
            nssm start $SERVICE
            Write-Host "      Servico reinstalado e iniciado." -ForegroundColor Green
        } else {
            Write-Host "      NSSM nao encontrado. Backend nao sera iniciado como servico." -ForegroundColor Red
        }
    } else {
        Write-Host "      Node.js nao encontrado no PATH." -ForegroundColor Red
    }
} else {
    if ($svc.Status -eq "Running") {
        Write-Host "      Servico ja esta rodando. Reiniciando..." -ForegroundColor Gray
        Restart-Service -Name $SERVICE -Force
        Write-Host "      Servico reiniciado." -ForegroundColor Green
    } else {
        Start-Service -Name $SERVICE
        Write-Host "      Servico iniciado (estado anterior: $($svc.Status))." -ForegroundColor Green
    }
}

# --- 4. Verificacao final ---
Write-Host ""
Write-Host "[4/4] Verificacao final..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Checa porta 4000
$portCheck = netstat -ano | Select-String ":4000"
if ($portCheck) {
    Write-Host "      Backend porta 4000: ATIVA" -ForegroundColor Green
} else {
    Write-Host "      Backend porta 4000: NAO DETECTADA" -ForegroundColor Red
    Write-Host "      Verifique os logs em: $ROOT\logs\backend-stderr.log" -ForegroundColor Yellow
}

# Testa /api/health
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:4000/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "      /api/health: $($resp.StatusCode) OK" -ForegroundColor Green
} catch {
    Write-Host "      /api/health: FALHOU - $($_.Exception.Message)" -ForegroundColor Red
}

# Verifica dist/index.html
if (Test-Path "$DIST\index.html") {
    Write-Host "      frontend/dist/index.html: EXISTE" -ForegroundColor Green
} else {
    Write-Host "      frontend/dist/index.html: NAO ENCONTRADO - Execute npm run build" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Concluido! Acesse: http://chamados.cbm.am.gov.br" -ForegroundColor Green
Write-Host "  Se ainda houver erro, verifique os logs em:" -ForegroundColor Yellow
Write-Host "  $ROOT\logs\backend-stderr.log" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
