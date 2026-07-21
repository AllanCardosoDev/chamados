<%
' ============================================================
' CBMAM - Desktop File Mover
' ============================================================
Response.ContentType = "text/html"
Dim fso, src, dest, desktopPath, fileName
Set fso = Server.CreateObject("Scripting.FileSystemObject")

' Tenta caminhos comuns de desktop
Dim desktops
desktops = Array("C:\Users\ServerAdmin\Desktop", "C:\Users\Administrador\Desktop", "C:\Users\Allan Cardoso\Desktop")
fileName = "Manual para permitir o acesso remoto.pdf" ' Tenta .pdf primeiro

src = ""
For Each d In desktops
    If fso.FileExists(d & "\" & fileName) Then
        src = d & "\" & fileName
        Exit For
    End If
    ' Tenta sem extensao se falhar
    If fso.FileExists(d & "\Manual para permitir o acesso remoto") Then
        src = d & "\Manual para permitir o acesso remoto"
        Exit For
    End If
Next

dest = "C:\inetpub\vhosts\cbm.am.gov.br\itsm\backend\uploads\manual-acesso-remoto.pdf"

Response.Write "<h2>Importador de Manual</h2>"

If src <> "" Then
    On Error Resume Next
    fso.CopyFile src, dest, True
    If Err.Number <> 0 Then
        Response.Write "<p style='color:red'>Erro ao copiar: " & Err.Description & "</p>"
    Else
        Response.Write "<p style='color:green'>Arquivo importado com sucesso para a pasta do sistema!</p>"
        Response.Write "<p>Origem: " & src & "</p>"
    End If
Else
    Response.Write "<p style='color:orange'>Arquivo não localizado na Desktop (verificamos: ServerAdmin, Administrador).</p>"
    Response.Write "<p>Por favor, coloque o arquivo na pasta <b>httpdocs</b> do seu site para que eu consiga puxar.</p>"
End If
%>
