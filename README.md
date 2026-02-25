# CredFacil - Sistema de Controle de Emprestimos

Aplicacao full-stack com autenticacao, PostgreSQL e deploy via Docker para VPS Ubuntu.

## Stack
- Frontend (base nova): Next.js (App Router) + TypeScript + Tailwind (`frontend/`)
- Backend (base atual): Node.js + Express + TypeScript (`backend/`) + Prisma
- Frontend legado em producao: EJS reaproveitando os HTMLs originais, servidos pelo backend
- Banco: PostgreSQL
- Migrations: Prisma
- Auth: email/senha com bcrypt + JWT em cookie httpOnly
- Validacao: Zod

## Funcionalidades MVP
- Login de admin
- Cadastro de clientes
- Cadastro e controle de emprestimos
- Controle de parcelas e registro de pagamentos
- Dashboard e relatorios com totais principais
- Envio de notificacoes WhatsApp via Cloud API (Meta)
- Resumo diario por e-mail com parcelas que vencem no dia seguinte

## Estrutura principal
- `backend/src/server.ts`: inicializacao do backend Express
- `backend/src/routes/*.ts`: paginas, auth, tabelas e pagamentos
- `backend/src/services/table-sync.service.ts`: adaptacao de dados entre frontend e banco
- `backend/src/views/*.ejs`: telas atuais reaproveitadas do prototipo
- `backend/prisma/schema.prisma`: modelos e indices
- `backend/prisma/migrations/*`: migrations
- `backend/prisma/seed.ts`: cria admin
- `frontend/app/*`: base do novo frontend Next.js (rota inicial em `/app`)
- `docker-compose.yml`: backend + frontend + postgres + nginx

## Modelos do banco
- `User` (admin)
- `Client`
- `Loan`
- `Installment` (suporte ao layout atual)
- `Payment`

Com integridade referencial por FK e cascatas.

## Rodando localmente (sem Docker)
1. Copie o arquivo de ambiente:
```bash
cp .env.example .env
```
2. Ajuste `DATABASE_URL` para seu PostgreSQL local.
3. Instale dependencias do backend:
```bash
cd backend
npm install
```
4. Gere cliente Prisma e aplique migrations:
```bash
npm run prisma:generate
npm run prisma:migrate:deploy
```
5. Crie usuario admin:
```bash
npm run db:seed
```
6. Suba a aplicacao:
```bash
npm run dev
```

Acesse: `http://localhost:3000/login`

Opcional (frontend Next base em paralelo):
```bash
cd ../frontend
npm install
npm run dev -- -p 3001
```
Acesse: `http://localhost:3001/app` (ou configure outra porta local).

## Configurar WhatsApp Cloud API
Defina no `.env`:

```bash
WHATSAPP_GRAPH_BASE_URL=https://graph.facebook.com
WHATSAPP_API_VERSION=v22.0
WHATSAPP_PHONE_NUMBER_ID=<seu_phone_number_id>
WHATSAPP_ACCESS_TOKEN=<seu_access_token>
PIX_KEY=<sua_chave_pix>
PAYMENT_LINK=<link_pagamento_opcional>
```

Sem esses campos, o envio server-side de notificacoes retorna erro de configuracao.
`PIX_KEY` e `PAYMENT_LINK` sao usados na mensagem padrao de cobranca do dashboard.

## Configurar notificacao por e-mail (vencimentos de amanha)
Defina no `.env`:

```bash
SMTP_HOST=smtp.seu-provedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<usuario_smtp>
SMTP_PASS=<senha_smtp>
SMTP_FROM="CredFacil <no-reply@seudominio.com>"

EMAIL_NOTIFY_ENABLED=true
EMAIL_NOTIFY_TO=seu-email@dominio.com,financeiro@dominio.com
EMAIL_NOTIFY_TZ=America/Sao_Paulo
EMAIL_NOTIFY_TIME=08:00
EMAIL_NOTIFY_RUN_ON_START=false
```

Com isso, o app envia 1 e-mail por dia no horario configurado com a lista de parcelas em aberto que vencem no dia seguinte.

Para testar manualmente sem esperar o horario:

```bash
curl -X POST http://localhost:3000/api/notifications/email/due-tomorrow \
  -H "Content-Type: application/json" \
  -b "credfacil_token=<SEU_COOKIE_DE_LOGIN>"
```

Para testar uma data especifica:

```bash
curl -X POST http://localhost:3000/api/notifications/email/due-tomorrow \
  -H "Content-Type: application/json" \
  -H "Cookie: credfacil_token=<SEU_COOKIE_DE_LOGIN>" \
  -d '{"targetDate":"2026-02-15"}'
```

## Deploy no VPS Ubuntu (Serverspace)

### 1) Pre-requisitos no VPS
```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose plugin
docker compose version
```

### 2) DNS do dominio
No provedor DNS, crie:
- `A` para `@` apontando para o IP publico do VPS
- `A` para `www` apontando para o mesmo IP

Confirme propagacao:
```bash
dig +short seu-dominio.com
dig +short www.seu-dominio.com
```

### 3) Subir com Docker
```bash
git clone <SEU_REPO>
cd <PASTA_DO_REPO>
cp .env.example .env
```

Edite `.env` e troque senhas/chaves (`POSTGRES_PASSWORD`, `JWT_SECRET`, etc).
Em ambiente sem HTTPS, mantenha `COOKIE_SECURE=false`. Depois de habilitar SSL, mude para `true`.

Suba os containers:
```bash
docker compose up -d --build
```

Ver logs:
```bash
docker compose logs -f backend
```

### 4) Migrations e admin
A migration roda no startup do container `backend` (`prisma migrate deploy`).

Se quiser rodar manualmente:
```bash
docker compose exec backend npm run prisma:migrate:deploy
```

Criar/atualizar admin:
```bash
docker compose exec backend npm run db:seed
```

Acesso inicial:
- Email: `ADMIN_EMAIL` do `.env`
- Senha: `ADMIN_PASSWORD` do `.env`

## Nginx reverse proxy e HTTPS (Certbot)
O projeto ja sobe Nginx em HTTP (`nginx/conf.d/default.conf`).

Para HTTPS:
1. Ajuste dominio real no Nginx.
2. Use o arquivo base: `nginx/conf.d/default-ssl.conf.example`.
3. Gere certificado com Certbot (webroot) no VPS:
```bash
mkdir -p certbot/www certbot/conf

docker run --rm -it \
  -v $(pwd)/certbot/www:/var/www/certbot \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  certbot/certbot certonly \
  --webroot -w /var/www/certbot \
  -d seu-dominio.com -d www.seu-dominio.com \
  -m seu-email@dominio.com --agree-tos --no-eff-email
```
4. Monte `certbot/conf` no container Nginx e reinicie.
5. Troque o `default.conf` pelo `default-ssl.conf.example` ajustado.

Renovacao automatica (cron exemplo):
```bash
0 3 * * * docker run --rm \
  -v /caminho/projeto/certbot/www:/var/www/certbot \
  -v /caminho/projeto/certbot/conf:/etc/letsencrypt \
  certbot/certbot renew --webroot -w /var/www/certbot --quiet && \
  docker compose -f /caminho/projeto/docker-compose.yml restart nginx
```

## Backup e restore PostgreSQL

### Backup
```bash
docker compose exec -T db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql
```

### Restore
```bash
cat backup.sql | docker compose exec -T db psql -U $POSTGRES_USER -d $POSTGRES_DB
```

## Rotas principais
- Login: `/login`
- Area protegida: `/admin/*`
- Dashboard consolidado: `/api/dashboard?period=6m&metric=recebido`
- Tabelas frontend: `/api/tables/:tableName`
- Pagamentos: `/api/payments`
- Notificacoes WhatsApp: `/api/notifications/whatsapp/batch`
- Notificacao e-mail (teste manual): `/api/notifications/email/due-tomorrow`
- Healthcheck: `/health`

## API Dashboard
Endpoint unico para renderizacao da dashboard:

`GET /api/dashboard?period=3m|6m|12m&metric=recebido|emprestado|lucro&tz=America/Sao_Paulo`

Exemplo de resposta:

```json
{
  "meta": {
    "generatedAt": "2026-02-13T03:15:14.912Z",
    "timezone": "America/Sao_Paulo",
    "period": "6m",
    "metric": "recebido"
  },
  "kpis": {
    "totalLoaned": 25000,
    "totalToReceive": 9850,
    "totalReceived": 19580,
    "receivedThisMonth": 3260,
    "totalOverdue": 2140,
    "profitTotal": 4580,
    "roiRate": 18.32,
    "delinquencyRate": 21.72
  },
  "dailySummary": {
    "dueToday": {
      "count": 2,
      "totalValue": 780,
      "href": "/admin/installments.html?status=pending&due=today"
    },
    "overdue": {
      "count": 4,
      "totalValue": 2140,
      "href": "/admin/installments.html?status=overdue"
    },
    "next7Days": {
      "count": 5,
      "totalValue": 1960,
      "href": "/admin/installments.html?status=pending&due=next7"
    }
  },
  "chart": {
    "metric": "recebido",
    "period": "6m",
    "points": [
      { "month": "2025-09", "label": "set. de 2025", "value": 2500 },
      { "month": "2025-10", "label": "out. de 2025", "value": 3150 }
    ],
    "hasData": true,
    "emptyMessage": "Sem dados no periodo."
  },
  "upcomingDue": [
    {
      "installmentId": 17,
      "loanId": 4,
      "debtorId": 2,
      "debtorName": "Maria Souza",
      "phone": "47999990000",
      "amount": 390,
      "dueDate": "2026-02-13",
      "dueRelative": "hoje",
      "status": "VENCE_HOJE",
      "statusLabel": "Vence hoje",
      "statusColor": "yellow",
      "pixKey": null,
      "paymentLink": null
    }
  ],
  "ranking": [
    {
      "debtorId": 2,
      "debtorName": "Maria Souza",
      "totalOverdue": 1140,
      "installmentsCount": 2,
      "href": "/admin/debtors.html?debtorId=2"
    }
  ]
}
```

## Observacoes
- `.env` real nao deve ser commitado.
- Os HTMLs originais foram reaproveitados em `EJS` mantendo o visual base.
