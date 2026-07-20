<%
' ============================================================
' CBMAM - Log Reader
' ============================================================
Response.ContentType = "text/plain"
Dim fso, logPath
Set fso = Server.CreateObject("Scripting.FileSystemObject")
logPath = "C:\inetpub\vhosts\cbm.am.gov.br\itsm\logs\backend-node.log"

If fso.FileExists(logPath) Then
    Dim f, content, lines, startLine
    Set f = fso.OpenTextFile(logPath, 1)
    content = f.ReadAll()
    f.Close
    
    lines = Split(content, vbLf)
    startLine = UBound(lines) - 50
    If startLine < 0 Then startLine = 0
    
    Dim i
    For i = startLine To UBound(lines)
        Response.Write lines(i) & vbLf
    Next
Else
    Response.Write "Log nao encontrado: " & logPath
End If
%>
