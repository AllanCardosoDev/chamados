<%
' ============================================================
' CBMAM - Cursos Content Check V3
' ============================================================
Response.ContentType = "text/plain"
On Error Resume Next
Dim fso, folder, subfolder, root
Set fso = Server.CreateObject("Scripting.FileSystemObject")

Function CheckPath(path)
    If fso.FolderExists(path) Then
        Response.Write ">>> ENCONTRADO EM: " & path & vbCrLf
        Set folder = fso.GetFolder(path)
        For Each subfolder In folder.SubFolders
            Response.Write "  [DIR] " & subfolder.Name & vbCrLf
        Next
        For Each file In folder.Files
            Response.Write "  [FILE] " & file.Name & vbCrLf
        Next
        Response.Write "------------------------" & vbCrLf
    End If
End Function

CheckPath("C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\cursos")
CheckPath("C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\cursos-main")
CheckPath("C:\inetpub\vhosts\cbm.am.gov.br\cursos")
CheckPath("C:\inetpub\vhosts\cbm.am.gov.br\cursos-main")
CheckPath("C:\inetpub\vhosts\cbm.am.gov.br\itsm\cursos")
CheckPath("C:\inetpub\vhosts\cbm.am.gov.br\itsm\cursos-main")

If Err.Number <> 0 Then
    Response.Write "ERRO VBS: " & Err.Description
End If
%>
