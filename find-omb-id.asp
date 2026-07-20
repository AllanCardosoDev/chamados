<%
' ============================================================
' CBMAM - Search for #milOmbSearch string
' ============================================================
Response.ContentType = "text/plain"
Dim fso, folder, subfolder, file, found
Set fso = Server.CreateObject("Scripting.FileSystemObject")

found = False

Sub GrepIn(path)
    If Not fso.FolderExists(path) Then Exit Sub
    Set folder = fso.GetFolder(path)
    
    ' Arquivos na pasta atual
    For Each file In folder.Files
        Dim ext
        ext = LCase(fso.GetExtensionName(file.Name))
        If ext = "js" Or ext = "jsx" Or ext = "html" Or ext = "php" Or ext = "asp" Or ext = "json" Then
            On Error Resume Next
            Dim f, content
            Set f = fso.OpenTextFile(file.Path, 1)
            content = f.ReadAll()
            f.Close
            If InStr(content, "milOmbSearch") > 0 Then
                Response.Write ">>> ENCONTRADO EM: " & file.Path & vbCrLf
                found = True
            End If
            On Error GoTo 0
        End If
    Next
    
    ' Subpastas (limitar profundidade para nao travar)
    For Each subfolder In folder.SubFolders
        If LCase(subfolder.Name) <> "node_modules" And LCase(subfolder.Name) <> ".next" Then
            GrepIn subfolder.Path
        End If
    Next
End Sub

Response.Write "Iniciando busca por 'milOmbSearch'..." & vbCrLf

GrepIn "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\sgseg"
GrepIn "C:\inetpub\vhosts\cbm.am.gov.br\sgseg"
GrepIn "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\sges"
GrepIn "C:\inetpub\vhosts\cbm.am.gov.br\sges"
GrepIn "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\seg"

If Not found Then
    Response.Write "Termo 'milOmbSearch' nao encontrado nas pastas provaveis."
End If
%>