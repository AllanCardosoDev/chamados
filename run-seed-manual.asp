<%
' ============================================================
' CBMAM - Seed Manual Execution
' ============================================================
Response.ContentType = "text/plain"
Dim shell, cmd, exec
Set shell = Server.CreateObject("WScript.Shell")
cmd = "cmd /c cd C:\inetpub\vhosts\cbm.am.gov.br\itsm && node seed-manual.js"
On Error Resume Next
Set exec = shell.Exec(cmd)

If Err.Number <> 0 Then
    Response.Write "Erro: " & Err.Description
Else
    Do While Not exec.StdOut.AtEndOfStream
        Response.Write exec.StdOut.ReadLine() & vbCrLf
    Loop
    Do While Not exec.StdErr.AtEndOfStream
        Response.Write "ERR: " & exec.StdErr.ReadLine() & vbCrLf
    Loop
End If
%>
