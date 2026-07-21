<%
Response.ContentType = "text/plain"
Dim shell, exec
Set shell = Server.CreateObject("WScript.Shell")
On Error Resume Next
Set exec = shell.Exec("cmd /c cd C:\inetpub\vhosts\cbm.am.gov.br\itsm && node check-kb.js")
If Err.Number <> 0 Then
    Response.Write "Erro: " & Err.Description
Else
    Response.Write exec.StdOut.ReadAll()
    Response.Write exec.StdErr.ReadAll()
End If
%>
