<%
If Request.QueryString("token") <> "CBMAM2026" Then
    Response.Status = "403 Forbidden"
    Response.Write "Acesso negado."
    Response.End
End If

Response.ContentType = "text/html; charset=utf-8"
Response.Write "<!DOCTYPE html><html><head><meta charset='utf-8'>"
Response.Write "<meta http-equiv='refresh' content='5'>"
Response.Write "<title>CBMAM ITSM - Diagnostico</title>"
Response.Write "<style>body{font-family:monospace;background:#111;color:#0f0;padding:20px}"
Response.Write "h2{color:#ff0} .ok{color:#0f0} .err{color:#f44} .warn{color:#fa0}"
Response.Write "pre{background:#000;padding:15px;border:1px solid #333;overflow-x:auto}"
Response.Write "a{color:#4af}</style></head><body>"
Response.Write "<h2>CBMAM ITSM - Diagn&oacute;stico do Backend</h2>"
Response.Write "<p style='color:#fa0'>Atualiza a cada 5 segundos.</p>"

Dim oFSO, oShell
Set oFSO   = Server.CreateObject("Scripting.FileSystemObject")
Set oShell = Server.CreateObject("WScript.Shell")

Dim nPort
nPort = oShell.Run("cmd /c netstat -ano | findstr :4001 | findstr LISTENING > NUL 2>&1", 0, True)
If nPort = 0 Then
    Response.Write "<p><span class='ok'>checkmark Node.js esta escutando na porta 4001</span></p>"
Else
    Response.Write "<p><span class='err'>times Node.js NAO esta escutando na porta 4001</span></p>"
    Response.Write "<p><a href='start-backend.asp?token=CBMAM2026'>Clique aqui para iniciar o backend</a></p>"
End If

Dim nTask
nTask = oShell.Run("schtasks /Query /TN ""CBMAM-ITSM-Backend"" > NUL 2>&1", 0, True)
If nTask = 0 Then
    Response.Write "<p><span class='ok'>checkmark Tarefa agendada 'CBMAM-ITSM-Backend' registrada</span></p>"
Else
    Response.Write "<p><span class='warn'>! Tarefa agendada nao encontrada (backend nao inicia no boot)</span></p>"
End If

Dim sLog
sLog = "C:\inetpub\vhosts\cbm.am.gov.br\itsm\logs\backend-node-4001.log"
Response.Write "<h3>Log do Node.js (" & sLog & ")</h3>"
Response.Write "<pre>"

If oFSO.FileExists(sLog) Then
    Dim oFileObj, oFileStream, sContent, aLines, i, nStart
    Set oFileObj = oFSO.GetFile(sLog)
    If oFileObj.Size > 0 Then
        Set oFileStream = oFileObj.OpenAsTextStream(1, 0)
        sContent = oFileStream.ReadAll()
        oFileStream.Close
        
        aLines = Split(sContent, vbCrLf)
        nStart = UBound(aLines) - 99
        If nStart < 0 Then nStart = 0
        For i = nStart To UBound(aLines)
            Dim sLine : sLine = aLines(i)
            If InStr(LCase(sLine), "error") > 0 Or InStr(LCase(sLine), "erro") > 0 Or InStr(LCase(sLine), "fail") > 0 Then
                Response.Write "<span class='err'>" & Server.HTMLEncode(sLine) & "</span>" & vbCrLf
            ElseIf InStr(LCase(sLine), "ok") > 0 Or InStr(LCase(sLine), "sucesso") > 0 Or InStr(LCase(sLine), "escutando") > 0 Then
                Response.Write "<span class='ok'>" & Server.HTMLEncode(sLine) & "</span>" & vbCrLf
            Else
                Response.Write Server.HTMLEncode(sLine) & vbCrLf
            End If
        Next
    Else
        Response.Write "<span class='warn'>Arquivo de log esta vazio. Aguardando inicializacao...</span>" & vbCrLf
    End If
Else
    Response.Write "<span class='warn'>Arquivo de log nao encontrado ainda.</span>" & vbCrLf
    Response.Write "Inicie o backend em: <a href='start-backend.asp?token=CBMAM2026'>start-backend.asp</a>"
End If

Response.Write "</pre>"
Response.Write "<hr><p>Links: "
Response.Write "<a href='/itsm/api/health' target='_blank'>/itsm/api/health</a> | "
Response.Write "<a href='/itsm/' target='_blank'>Aplicacao ITSM</a> | "
Response.Write "<a href='start-backend.asp?token=CBMAM2026'>Reiniciar backend</a>"
Response.Write "</p></body></html>"
%>
