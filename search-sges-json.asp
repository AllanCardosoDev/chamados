<%
' ============================================================
' CBMAM - Search SGES Localidade JSON
' ============================================================
Response.ContentType = "text/plain"
Dim fso, folder, subfolder, file, foundFile
Set fso = Server.CreateObject("Scripting.FileSystemObject")

foundFile = ""

Sub SearchJsonIn(path, depth)
    If depth > 3 Then Exit Sub
    If fso.FolderExists(path) Then
        On Error Resume Next
        Set folder = fso.GetFolder(path)
        For Each file In folder.Files
            Dim n
            n = LCase(file.Name)
            If Right(n, 5) = ".json" Then
                If InStr(n, "local") > 0 Or InStr(n, "unidade") > 0 Or InStr(n, "sges") > 0 Then
                    foundFile = file.Path
                    Response.Write ">>> JSON ENCONTRADO: " & foundFile & vbCrLf
                    
                    ' Le e mostra o comeco
                    Dim f, content
                    Set f = fso.OpenTextFile(file.Path, 1)
                    content = ""
                    If Not f.AtEndOfStream Then content = Left(f.ReadAll(), 200)
                    f.Close
                    Response.Write content & vbCrLf & "..." & vbCrLf
                    
                    ' Copia para o frontend
                    fso.CopyFile foundFile, "C:\inetpub\vhosts\cbm.am.gov.br\itsm\frontend\public\localidades.json", True
                    Response.Write "Arquivo copiado para o frontend/public com sucesso!" & vbCrLf
                    Exit Sub
                End If
            End If
        Next
        For Each subfolder In folder.SubFolders
            Dim s
            s = LCase(subfolder.Name)
            If s <> "node_modules" And s <> ".git" And s <> ".next" Then
                SearchJsonIn subfolder.Path, depth + 1
            End If
            If foundFile <> "" Then Exit Sub
        Next
        On Error GoTo 0
    End If
End Sub

Response.Write "Iniciando busca..." & vbCrLf
SearchJsonIn "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\sges", 0
If foundFile = "" Then SearchJsonIn "C:\inetpub\vhosts\cbm.am.gov.br\sges", 0
If foundFile = "" Then SearchJsonIn "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\sgseg", 0
If foundFile = "" Then SearchJsonIn "C:\inetpub\vhosts\cbm.am.gov.br\sgseg", 0
If foundFile = "" Then SearchJsonIn "C:\inetpub\vhosts\cbm.am.gov.br\seg", 0

If foundFile = "" Then
    Response.Write "Nenhum arquivo JSON de localidades encontrado."
End If
%>
