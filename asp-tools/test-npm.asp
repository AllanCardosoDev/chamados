<%
' ============================================================
' CBMAM ITSM - NPM Test
' ============================================================
Response.ContentType = "text/plain"
Dim shell, exec
Set shell = Server.CreateObject("WScript.Shell")
On Error Resume Next
Set exec = shell.Exec("npm --version")
If Err.Number <> 0 Then
    Response.Write "Erro: " & Err.Description
Else
    Response.Write "NPM Version: " & exec.StdOut.ReadAll()
End If
%>
