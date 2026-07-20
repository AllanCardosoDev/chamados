<%
' ============================================================
' CBMAM - Localizador de JSON SGES
' ============================================================
Response.ContentType = "text/plain"
Dim fso, folder, subfolder, file
Set fso = Server.CreateObject("Scripting.FileSystemObject")

Sub SearchJsonIn(path)
    If fso.FolderExists(path) Then
        Response.Write "Procurando em: " & path & vbCrLf
        Set folder = fso.GetFolder(path)
        For Each file In folder.Files
            If LCase(fso.GetExtensionName(file.Name)) = "json" Then
                ' Mostrar os primeiros caracteres para identificar o conteudo
                Dim f, content
                Set f = fso.OpenTextFile(file.Path, 1)
                content = ""
                If Not f.AtEndOfStream Then content = Left(f.ReadAll(), 100)
                f.Close
                Response.Write "  [JSON ENCONTRADO] " & file.Name & " -> " & Replace(content, vbCrLf, "") & vbCrLf
            End If
        Next
        For Each subfolder In folder.SubFolders
            ' Evita node_modules
            If LCase(subfolder.Name) <> "node_modules" And LCase(subfolder.Name) <> ".next" And LCase(subfolder.Name) <> ".git" Then
                For Each file In subfolder.Files
                    If LCase(fso.GetExtensionName(file.Name)) = "json" Then
                        Response.Write "  [JSON ENCONTRADO] " & subfolder.Name & "\" & file.Name & vbCrLf
                    End If
                Next
            End If
        Next
    End If
End Sub

SearchJsonIn "C:\inetpub\vhosts\cbm.am.gov.br\sges"
SearchJsonIn "C:\inetpub\vhosts\cbm.am.gov.br\sgseg"
SearchJsonIn "C:\inetpub\vhosts\cbm.am.gov.br\seg"
SearchJsonIn "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\sges"
SearchJsonIn "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\sgseg"
SearchJsonIn "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\seg"

Response.Write "Fim da busca."
%>