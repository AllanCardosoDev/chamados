<%
' ============================================================
' CBMAM - Teste Upload Direto
' ============================================================
Response.ContentType = "text/plain"
Dim fso, testFolder, testFile, content
Set fso = Server.CreateObject("Scripting.FileSystemObject")
testFolder = "C:\inetpub\vhosts\cbm.am.gov.br\itsm\backend\uploads\knowledge_base"

Response.Write "Testando permissao de escrita..." & vbCrLf

If Not fso.FolderExists(testFolder) Then
    On Error Resume Next
    fso.CreateFolder(testFolder)
    If Err.Number <> 0 Then
        Response.Write "ERRO: Nao foi possivel criar a pasta: " & Err.Description & vbCrLf
    Else
        Response.Write "Pasta criada com sucesso: " & testFolder & vbCrLf
    End If
    On Error GoTo 0
Else
    Response.Write "Pasta ja existe: " & testFolder & vbCrLf
End If

testFile = testFolder & "\teste_permissao.txt"
On Error Resume Next
Dim f
Set f = fso.CreateTextFile(testFile, True)
f.Write "Teste de permissao OK"
f.Close
If Err.Number <> 0 Then
    Response.Write "ERRO: Nao foi possivel escrever na pasta: " & Err.Description & vbCrLf
Else
    Response.Write "Escrita de arquivo OK!" & vbCrLf
End If
On Error GoTo 0
%>