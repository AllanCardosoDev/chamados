<%
' ============================================================
' CBMAM - Test Upload API
' ============================================================
Response.ContentType = "text/plain"
Dim http, url, payload, res
url = "http://localhost:4000/api/knowledge/upload" ' Bypass IIS, test node directly
payload = "{""filename"":""test.txt"",""data"":""data:text/plain;base64,SGVsbG8gV29ybGQ=""}"

Set http = Server.CreateObject("MSXML2.ServerXMLHTTP.6.0")
On Error Resume Next
http.Open "POST", url, False
http.setRequestHeader "Content-Type", "application/json"
' Simulando um admin para o middleware authRequired e requireRole. Isso vai falhar em auth, mas retorna 401, provando que o Express esta rodando e aceitando JSON!
http.Send payload

If Err.Number <> 0 Then
    Response.Write "Erro ao conectar no Node: " & Err.Description
Else
    Response.Write "Status: " & http.Status & vbCrLf
    Response.Write "Body: " & http.ResponseBody
End If
%>
