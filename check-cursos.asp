<%
' ============================================================
' CBMAM - Cursos Directory Check
' ============================================================
Response.ContentType = "text/plain"
Dim fso, folder, subfolder, file, root
root = "C:\inetpub\vhosts\cbm.am.gov.br\cursos"
Set fso = Server.CreateObject("Scripting.FileSystemObject")
If fso.FolderExists(root) Then
    Response.Write "Pasta 'cursos' existe." & vbCrLf
    Set folder = fso.GetFolder(root)
    Response.Write "Subpastas:" & vbCrLf
    For Each subfolder In folder.SubFolders
        Response.Write "  [DIR] " & subfolder.Name & vbCrLf
    Next
    Response.Write "Arquivos:" & vbCrLf
    For Each file In folder.Files
        Response.Write "  [FILE] " & file.Name & vbCrLf
    Next
Else
    Response.Write "Pasta 'cursos' NAO existe." & vbCrLf
End If
%>
