<%
' ============================================================
' CBMAM - Cursos Manual Setup Script
' ============================================================
Response.ContentType = "text/html"
Dim fso, root, itsm, cursos
root = "C:\inetpub\vhosts\cbm.am.gov.br"
itsm = root & "\itsm"
cursos = root & "\cursos"
Set fso = Server.CreateObject("Scripting.FileSystemObject")

Response.Write "<h2>Setup Manual do Portal de Cursos</h2>"

' 1. Criar pasta se não existir
If Not fso.FolderExists(cursos) Then
    On Error Resume Next
    fso.CreateFolder(cursos)
    If Err.Number <> 0 Then
        Response.Write "<p style='color:red'>ERRO ao criar pasta: " & Err.Description & "</p>"
    Else
        Response.Write "<p style='color:green'>Pasta 'cursos' criada com sucesso.</p>"
    End If
    On Error GoTo 0
Else
    Response.Write "<p>Pasta 'cursos' já existe.</p>"
End If

' 2. Instruções
Response.Write "<h3>Próximos Passos:</h3>"
Response.Write "<ul>"
Response.Write "<li>Baixe o projeto do GitHub: <a href='https://github.com/AllanCardosoDev/cursos/archive/refs/heads/main.zip'>Download ZIP</a></li>"
Response.Write "<li>Extraia o conteúdo na pasta: <code>" & cursos & "</code></li>"
Response.Write "<li>Após extrair, eu poderei configurar o IIS e integrar com o ITSM automaticamente.</li>"
Response.Write "</ul>"
%>
