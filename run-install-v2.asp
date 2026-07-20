<%
' ============================================================
' CBMAM ITSM - Advanced NPM Installer
' ============================================================
Server.ScriptTimeout = 900
Response.ContentType = "text/plain"

Dim token, pass
token = Request.QueryString("token")
pass  = "CBMAM2026"

If token <> pass Then
    Response.Write "ERRO: TOKEN INVALIDO"
    Response.End
End If

Dim shell, fso, logFile, cmd
Set shell = Server.CreateObject("WScript.Shell")
Set fso = Server.CreateObject("Scripting.FileSystemObject")

logFile = "C:\inetpub\vhosts\cbm.am.gov.br\itsm\logs\install_npm.log"
cmd = "cmd /c cd C:\inetpub\vhosts\cbm.am.gov.br\itsm\backend && npm install nodemailer > """ & logFile & """ 2>&1"

Response.Write "Iniciando instalacao..." & vbCrLf
Response.Write "Comando: " & cmd & vbCrLf

' 0 = Oculto, True = Esperar terminar
On Error Resume Next
Dim ret
ret = shell.Run(cmd, 0, True)

If Err.Number <> 0 Then
    Response.Write "Erro ao executar shell: " & Err.Description & vbCrLf
Else
    Response.Write "Processo finalizado com codigo: " & ret & vbCrLf
End If

If fso.FileExists(logFile) Then
    Response.Write "--- LOG DE SAIDA ---" & vbCrLf
    Dim f
    Set f = fso.OpenTextFile(logFile, 1)
    Response.Write f.ReadAll()
    f.Close
Else
    Response.Write "Arquivo de log nao gerado." & vbCrLf
End If
%>
