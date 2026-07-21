' ============================================================
' CBMAM ITSM - Instalador do Backend Node.js
' Execute este arquivo UMA VEZ como Administrador
' Ele registra o backend como tarefa agendada e o inicia
' ============================================================

Option Explicit

' Auto-elevacao UAC: se nao estiver elevado, pede elevacao
If Not WScript.Arguments.Named.Exists("elevated") Then
    Dim oShellElev
    Set oShellElev = CreateObject("Shell.Application")
    oShellElev.ShellExecute "wscript.exe", _
        Chr(34) & WScript.ScriptFullName & Chr(34) & " /elevated", _
        "", "runas", 1
    WScript.Quit
End If

Dim oFSO, oShell, oFile, sXml, sTempXml, nRet
Set oFSO   = CreateObject("Scripting.FileSystemObject")
Set oShell = CreateObject("WScript.Shell")

' Verifica se o Node.exe existe
Dim sNode
sNode = "C:\PROGRA~1\nodejs\node.exe"
If Not oFSO.FileExists("C:\Program Files\nodejs\node.exe") Then
    MsgBox "ERRO: node.exe nao encontrado em C:\Program Files\nodejs\" & vbCrLf & _
           "Instale o Node.js antes de continuar.", vbCritical, "CBMAM ITSM"
    WScript.Quit 1
End If

' Verifica se o iisentry.cjs existe
Dim sScript
sScript = "C:\inetpub\vhosts\cbm.am.gov.br\itsm\backend\src\iisentry.cjs"
If Not oFSO.FileExists(sScript) Then
    MsgBox "ERRO: iisentry.cjs nao encontrado em:" & vbCrLf & sScript, _
           vbCritical, "CBMAM ITSM"
    WScript.Quit 1
End If

' Cria XML da tarefa agendada (UTF-16 para Task Scheduler)
sTempXml = oFSO.GetSpecialFolder(2) & "\cbmam-itsm-task.xml"

sXml = "<?xml version=""1.0"" encoding=""UTF-16""?>" & vbCrLf & _
"<Task version=""1.2"" xmlns=""http://schemas.microsoft.com/windows/2004/02/mit/task"">" & vbCrLf & _
"  <RegistrationInfo>" & vbCrLf & _
"    <Author>CBMAM-TI</Author>" & vbCrLf & _
"    <Description>Backend Node.js do ITSM CBMAM - porta 4000</Description>" & vbCrLf & _
"  </RegistrationInfo>" & vbCrLf & _
"  <Triggers>" & vbCrLf & _
"    <BootTrigger><Enabled>true</Enabled></BootTrigger>" & vbCrLf & _
"  </Triggers>" & vbCrLf & _
"  <Principals>" & vbCrLf & _
"    <Principal id=""Author"">" & vbCrLf & _
"      <UserId>S-1-5-18</UserId>" & vbCrLf & _
"      <RunLevel>HighestAvailable</RunLevel>" & vbCrLf & _
"    </Principal>" & vbCrLf & _
"  </Principals>" & vbCrLf & _
"  <Settings>" & vbCrLf & _
"    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>" & vbCrLf & _
"    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>" & vbCrLf & _
"    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>" & vbCrLf & _
"    <AllowHardTerminate>false</AllowHardTerminate>" & vbCrLf & _
"    <StartWhenAvailable>true</StartWhenAvailable>" & vbCrLf & _
"    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>" & vbCrLf & _
"    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>" & vbCrLf & _
"    <Priority>7</Priority>" & vbCrLf & _
"    <RestartOnFailure><Interval>PT1M</Interval><Count>999</Count></RestartOnFailure>" & vbCrLf & _
"  </Settings>" & vbCrLf & _
"  <Actions Context=""Author"">" & vbCrLf & _
"    <Exec>" & vbCrLf & _
"      <Command>C:\PROGRA~1\nodejs\node.exe</Command>" & vbCrLf & _
"      <Arguments>src\iisentry.cjs</Arguments>" & vbCrLf & _
"      <WorkingDirectory>C:\inetpub\vhosts\cbm.am.gov.br\itsm\backend</WorkingDirectory>" & vbCrLf & _
"    </Exec>" & vbCrLf & _
"  </Actions>" & vbCrLf & _
"</Task>"

' Salva como UTF-16 (necessario para schtasks /XML)
Set oFile = oFSO.CreateTextFile(sTempXml, True, True)
oFile.Write sXml
oFile.Close

' Remove tarefa anterior se existir
oShell.Run "schtasks /Delete /F /TN ""CBMAM-ITSM-Backend""", 0, True

' Registra a tarefa a partir do XML
nRet = oShell.Run("schtasks /Create /F /TN ""CBMAM-ITSM-Backend"" /XML """ & sTempXml & """", 0, True)

' Remove XML temporario
If oFSO.FileExists(sTempXml) Then oFSO.DeleteFile sTempXml

If nRet <> 0 Then
    MsgBox "ERRO ao registrar a tarefa agendada (codigo " & nRet & ")." & vbCrLf & _
           "Verifique se esta executando como Administrador.", vbCritical, "CBMAM ITSM"
    WScript.Quit 1
End If

' Inicia imediatamente
oShell.Run "schtasks /Run /TN ""CBMAM-ITSM-Backend""", 0, True

' Aguarda 4 segundos para o Node iniciar
WScript.Sleep 4000

MsgBox "Backend CBMAM ITSM instalado e iniciado!" & vbCrLf & vbCrLf & _
       "- Tarefa: CBMAM-ITSM-Backend" & vbCrLf & _
       "- Inicia automaticamente a cada boot" & vbCrLf & _
       "- Reinicia sozinho em caso de falha" & vbCrLf & vbCrLf & _
       "Acesse: http://itsm.cbm.am.gov.br" & vbCrLf & _
       "Saude da API: http://itsm.cbm.am.gov.br/api/health", _
       vbInformation, "CBMAM ITSM"
