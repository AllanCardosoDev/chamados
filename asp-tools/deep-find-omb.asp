<%
' ============================================================
' CBMAM - Advanced Content Finder (Deep Search)
' ============================================================
Server.ScriptTimeout = 600
Response.ContentType = "text/plain"
Dim fso
Set fso = Server.CreateObject("Scripting.FileSystemObject")

Sub DeepSearch(dirPath, pattern)
    If Not fso.FolderExists(dirPath) Then Exit Sub
    Dim folder, subfolder, file, stream, content
    Set folder = fso.GetFolder(dirPath)
    
    For Each file In folder.Files
        If InStr(".js.jsx.html.php.asp.json.txt.cjs.mjs", LCase(fso.GetExtensionName(file.Name))) > 0 Then
            On Error Resume Next
            Set stream = file.OpenAsTextStream(1, -2) ' Read-only, default format
            content = stream.ReadAll()
            stream.Close
            If InStr(content, pattern) > 0 Then
                Response.Write "ACHOU EM: " & file.Path & vbCrLf
            End If
            On Error GoTo 0
        End If
    Next
    
    For Each subfolder In folder.SubFolders
        Dim n
        n = LCase(subfolder.Name)
        If n <> "node_modules" And n <> ".next" And n <> ".git" And n <> "dist" And n <> "vendor" Then
            DeepSearch subfolder.Path, pattern
        End If
    Next
End Sub

Response.Write "--- BUSCA PROFUNDA: milOmbSearch ---" & vbCrLf
DeepSearch "C:\inetpub\vhosts\cbm.am.gov.br", "milOmbSearch"
Response.Write "--- FIM ---"
%>