<%
' ============================================================
' CBMAM - File Locator
' ============================================================
Response.ContentType = "text/plain"
Dim fso, folder, file, searchName
searchName = "Manual para permitir o acesso remoto"
Set fso = Server.CreateObject("Scripting.FileSystemObject")

Sub SearchIn(path)
    If fso.FolderExists(path) Then
        Response.Write "Procurando em: " & path & vbCrLf
        Set folder = fso.GetFolder(path)
        For Each file In folder.Files
            If InStr(LCase(file.Name), LCase(searchName)) > 0 Then
                Response.Write ">>> ENCONTRADO: " & file.Path & vbCrLf
            End If
        Next
        ' Nao faz recursivo para evitar travar o server
    End If
End Sub

' Locais provaveis
SearchIn "C:\Users\ServerAdmin\Desktop"
SearchIn "C:\Users\Administrador\Desktop"
SearchIn "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs"
%>
