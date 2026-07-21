<%
' ============================================================
' CBMAM ITSM - Rebuild do Frontend
' Acesse: https://www.cbm.am.gov.br/itsm/run-build.asp?token=CBMAM2026
' Este script recompila o frontend React com base=/itsm/ e
' VITE_API_URL=/itsm/api. Apos o build, o dist/ sera atualizado.
' ============================================================

If Request.QueryString("token") <> "CBMAM2026" Then
    Response.Status = "403 Forbidden"
    Response.Write "Acesso negado. Use: ?token=CBMAM2026"
    Response.End
End If

Response.ContentType = "text/html; charset=utf-8"
Response.Write "<!DOCTYPE html><html><head><meta charset='utf-8'>"
Response.Write "<title>CBMAM ITSM - Build Frontend</title>"
Response.Write "<style>body{font-family:monospace;background:#111;color:#0f0;padding:20px}"
Response.Write "h2{color:#ff0} .ok{color:#0f0} .err{color:#f44} .warn{color:#fa0}"
Response.Write "pre{background:#000;padding:15px;border:1px solid #333;overflow-x:auto;max-height:600px}"
Response.Write "a{color:#4af}</style></head><body>"
Response.Write "<h2>CBMAM ITSM - Recompilacao do Frontend</h2>"
Response.Write "<p style='color:#fa0'>Aguarde — o build pode levar 60-90 segundos. Nao feche esta pagina.</p><pre>"

Dim oShell, oFSO
Set oFSO   = Server.CreateObject("Scripting.FileSystemObject")
Set oShell = Server.CreateObject("WScript.Shell")

Dim sFrontendDir, sLogFile, sNpm
sFrontendDir = "C:\inetpub\vhosts\cbm.am.gov.br\itsm\frontend"
sLogFile     = "C:\inetpub\vhosts\cbm.am.gov.br\itsm\logs\build.log"
sNpm         = "C:\PROGRA~1\nodejs\npm.cmd"

' Verifica pre-requisitos
If Not oFSO.FileExists("C:\Program Files\nodejs\npm.cmd") Then
    Response.Write "<span class='err'>ERRO: npm.cmd nao encontrado em C:\Program Files\nodejs\</span>"
    Response.End
End If
Response.Write "<span class='ok'>OK</span> - npm encontrado" & vbCrLf

If Not oFSO.FolderExists(sFrontendDir & "\node_modules") Then
    Response.Write "<span class='err'>ERRO: node_modules nao encontrado em " & sFrontendDir & "</span>"
    Response.End
End If
Response.Write "<span class='ok'>OK</span> - node_modules encontrado" & vbCrLf

If Not oFSO.FolderExists("C:\inetpub\vhosts\cbm.am.gov.br\itsm\logs") Then
    oFSO.CreateFolder "C:\inetpub\vhosts\cbm.am.gov.br\itsm\logs"
End If

' Apaga log antigo
If oFSO.FileExists(sLogFile) Then oFSO.DeleteFile sLogFile

Response.Write vbCrLf & "Iniciando build React (base=/itsm/ VITE_API_URL=/itsm/api)..." & vbCrLf
Response.Write "Log em: " & sLogFile & vbCrLf & vbCrLf

' Executa o build de forma SINCRONA (aguarda conclusao)
Dim sCmd, nRet
sCmd = "cmd /c cd /d """ & sFrontendDir & """ && """ & sNpm & """ run build > """ & sLogFile & """ 2>&1"
nRet = oShell.Run(sCmd, 0, True)

' Le e exibe o log
If oFSO.FileExists(sLogFile) Then
    Dim oFile, sContent, aLines, i
    Set oFile = oFSO.OpenTextFile(sLogFile, 1, False, 0)
    sContent  = oFile.ReadAll()
    oFile.Close
    aLines = Split(sContent, vbLf)
    For i = 0 To UBound(aLines)
        Dim sLine : sLine = Replace(aLines(i), vbCr, "")
        If InStr(LCase(sLine), "error") > 0 Or InStr(LCase(sLine), "erro") > 0 Or InStr(LCase(sLine), "fail") > 0 Then
            Response.Write "<span class='err'>" & Server.HTMLEncode(sLine) & "</span>" & vbCrLf
        ElseIf InStr(sLine, "built in") > 0 Or InStr(LCase(sLine), "vite") > 0 Or InStr(LCase(sLine), "dist") > 0 Then
            Response.Write "<span class='ok'>" & Server.HTMLEncode(sLine) & "</span>" & vbCrLf
        ElseIf sLine <> "" Then
            Response.Write Server.HTMLEncode(sLine) & vbCrLf
        End If
    Next
Else
    Response.Write "<span class='warn'>Log nao gerado.</span>" & vbCrLf
End If

Response.Write vbCrLf & "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" & vbCrLf
If nRet = 0 Then
    Response.Write "<span class='ok'>BUILD CONCLUIDO COM SUCESSO (codigo " & nRet & ")</span>" & vbCrLf
    Response.Write vbCrLf & "Proximos passos:" & vbCrLf
    Response.Write "  1. <a href='start-backend.asp?token=CBMAM2026'>Reiniciar o backend Node.js</a>" & vbCrLf
    Response.Write "  2. <a href='https://www.cbm.am.gov.br/itsm/' target='_blank'>Testar o sistema ITSM</a>" & vbCrLf
    Response.Write "  3. <a href='/itsm/api/health' target='_blank'>Testar API /itsm/api/health</a>" & vbCrLf
Else
    Response.Write "<span class='err'>BUILD FALHOU (codigo " & nRet & ")</span>" & vbCrLf
    Response.Write "Verifique o log acima e tente novamente." & vbCrLf
End If
Response.Write "</pre></body></html>"
%>
