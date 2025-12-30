#### 📄 `README-DEPLOY.md`
Reescrito para focar na estratégia "Monólito Modular" no Render (Backend servindo Frontend), que é o método mais econômico e sincronizado para o seu setup atual.

```markdown
# Guia de Implantação (Deploy) - SGAC-BRAZ v5.0.0

Este guia descreve como publicar o sistema completo (Frontend + Backend) no **Render**, utilizando o **Neon** como banco de dados.

O sistema está configurado para que o Backend (Fastify) sirva os arquivos estáticos do Frontend (React/Vite). Isso significa que precisaremos de apenas **um serviço** no Render.

## Pré-requisitos

1.  Código fonte no **GitHub**.
2.  Conta no **Neon** (neon.tech) com um banco de dados criado.
3.  Conta no **Render** (render.com).

---

## Passo 1: Configurar o Banco de Dados (Neon)

1.  Acesse o dashboard do Neon.
2.  Crie um novo projeto/banco se ainda não tiver.
3.  Copie a **Connection String** (selecione a opção "Pooled connection" se disponível para melhor performance).
    * Ex: `postgresql://user:pass@ep-xyz.aws.neon.tech/neondb?sslmode=require`

---

## Passo 2: Configurar o Serviço no Render

1.  No painel do Render, clique em **New +** e selecione **Web Service**.
2.  Conecte seu repositório do GitHub.
3.  Preencha as configurações:

    * **Name:** `sgac-braz-sistema`
    * **Environment:** `Node`
    * **Region:** Escolha a mais próxima (ex: Ohio ou Frankfurt).
    * **Branch:** `main` (ou a branch de produção).

### 2.1 Configuração de Build e Start (Crucial)

Como temos frontend e backend no mesmo repo, precisamos compilar ambos.

* **Root Directory:** Deixe em branco (use a raiz).
* **Build Command:**
    Este comando entra na pasta do front, instala e compila. Depois entra no back, instala, gera o cliente prisma e compila.
    ```bash
    cd frontend && npm install && npm run build && cd ../backend && npm install && npx prisma generate && npm run build
    ```
* **Start Command:**
    Inicia o servidor compilado.
    ```bash
    cd backend && npm start
    ```

### 2.2 Variáveis de Ambiente (Environment Variables)

Adicione as seguintes chaves:

| Chave | Valor |
| :--- | :--- |
| `DATABASE_URL` | Sua string de conexão do **Neon** (Passo 1). |
| `JWT_SECRET` | Uma senha longa e aleatória para segurança dos tokens. |
| `NODE_ENV` | `production` |
| `TZ` | `America/Sao_Paulo` (Para garantir fusos horários corretos). |

---

## Passo 3: Finalizar e Testar

1.  Clique em **Create Web Service**.
2.  O Render iniciará o processo de build (pode levar alguns minutos na primeira vez pois compilará o React e o Node).
3.  Acompanhe os logs. Se vir `🚀 Servidor rodando v5.0.0!`, o deploy foi um sucesso.
4.  Acesse a URL fornecida pelo Render (ex: `https://sgac-braz-sistema.onrender.com`).

**Nota:** Como o backend serve o frontend, você não precisa configurar variáveis como `VITE_API_URL` no frontend, pois as chamadas relativas (`/api/...`) funcionarão automaticamente no mesmo domínio.