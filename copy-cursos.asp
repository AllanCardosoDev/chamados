<%
' ============================================================
' CBMAM - Cursos Mover
' ============================================================
Response.ContentType = "text/plain"
Dim fso, src, dest
Set fso = Server.CreateObject("Scripting.FileSystemObject")

src = "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\cursos"
dest = "C:\inetpub\vhosts\cbm.am.gov.br\itsm\cursos_temp"

On Error Resume Next
If fso.FolderExists(src) Then
    If fso.FolderExists(dest) Then
        fso.DeleteFolder dest, True
    End If
    fso.CopyFolder src, dest, True
    If Err.Number <> 0 Then
        Response.Write "Erro ao copiar: " & Err.Description
    Else
        Response.Write "Pasta copiada com sucesso para o workspace do ITSM para configuracao."
    End If
Else
    Response.Write "Pasta origem nao encontrada: " & src
End If
%>
