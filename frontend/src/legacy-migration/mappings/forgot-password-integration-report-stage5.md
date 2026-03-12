# Etapa 5 - Integration Report (Forgot Password)

## Escopo

- Tela nova: `/migration/forgot-password`
- Tela legada preservada: `/forgot-password`
- APIs reais utilizadas:
  - `GET /auth/me`
  - `POST /auth/forgot-password`

## Validacoes executadas

1. **Rota nova acessivel**
   - Request: `GET /migration/forgot-password`
   - Resultado: `200`

2. **Rota legada ainda ativa**
   - Request: `GET /forgot-password`
   - Resultado: `200`

3. **Sessao nao autenticada**
   - Request: `GET /auth/me` sem cookie
   - Resultado: `401` (esperado)

4. **Forgot password com email valido**
   - Request: `POST /auth/forgot-password` com JSON valido
   - Resultado: `200` com mensagem neutra de recuperacao (esperado)

5. **Forgot password com email invalido**
   - Request: `POST /auth/forgot-password` com `email` invalido
   - Resultado: `400` com payload de validacao Zod (esperado)

## Observacoes de paridade

- A tela migrada mantem `credentials: "include"` nas chamadas.
- Em caso de erro HTTP com payload JSON (`message`), a tela migrada exibe mensagem em estado de sucesso, como no legado.
- Somente erros de rede/excecao sem payload utilizam mensagem generica de erro visual.

## Risco conhecido (fora do escopo da tela)

- Se o cliente enviar JSON malformado (payload invalido no parser), o backend responde `500`.
- Causa observada: erro de parse do `body-parser` cai no handler generico.
- Isso nao afeta o fluxo normal da tela migrada, pois o frontend envia JSON valido.
