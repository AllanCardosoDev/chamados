<%
' ============================================================
' CBMAM - Check KB
' ============================================================
Response.ContentType = "text/plain"
Dim http, url, res
url = "http://localhost:4000/api/knowledge" ' Precisa auth, vai dar 401

' Vamos ler o DB direto
Dim fso, connString
' Nao posso rodar node aqui sem arquivo.
%>
