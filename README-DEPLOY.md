# Guia de Implantação (Deploy) do SGAC-BRAZ

Este documento contém o passo a passo para publicar o backend e o frontend da aplicação, tornando-a acessível online.

## Pré-requisitos

-   **Conta no GitHub (ou GitLab/Bitbucket):** Essencial para a integração com os serviços de hospedagem.
-   **Conta na Render:** [render.com](https://render.com/)
-   **Conta na Vercel:** [vercel.com](https://vercel.com/)

---

## Parte 1: Deploy do Backend (API na Render)

### 1.1. Preparar o Código do Backend

Precisamos de adicionar scripts ao `package.json` para que a Render saiba como "construir" e "iniciar" a nossa aplicação.

-   **Atualize o seu `backend/package.json`** para incluir os scripts `build` e `start`.
-   **Verifique o `backend/src/server.ts`** para garantir que ele está a escutar no host `0.0.0.0`, o que é necessário para ambientes de produção.

### 1.2. Configurar o Projeto na Render

1.  Aceda ao seu painel da Render e clique em **"New +"** > **"Web Service"**.
2.  **Conecte a sua conta do GitHub** e selecione o repositório do seu projeto.
3.  Preencha as configurações do serviço:
    -   **Name:** `sgac-braz-backend` (ou o nome que preferir).
    -   **Root Directory:** `backend` (Isto diz à Render para olhar apenas para a pasta do backend).
    -   **Runtime:** `Node`.
    -   **Build Command:** `npm install && npm run build`
    -   **Start Command:** `node dist/server.js`
    -   **Plano:** Selecione o plano **Free**.

4.  Clique em **"Advanced Settings"** e adicione as **Environment Variables**:
    -   **Chave:** `DATABASE_URL`
        -   **Valor:** Cole aqui a sua **URL de conexão do Supabase** (a mesma que está no seu ficheiro `.env`).
    -   **Chave:** `JWT_SECRET`
        -   **Valor:** Cole aqui a sua **chave secreta do JWT** (a mesma que está no seu ficheiro `.env`).

5.  Clique em **"Create Web Service"**. A Render irá começar a construir e a publicar a sua API. Este processo pode levar alguns minutos.
6.  Após a conclusão, a Render irá fornecer-lhe a **URL pública do seu backend** (algo como `https://sgac-braz-backend.onrender.com`). Copie este endereço.

---

## Parte 2: Deploy do Frontend (Interface na Vercel)

### 2.1. Configurar o Projeto na Vercel

1.  Aceda ao seu painel da Vercel e clique em **"Add New..."** > **"Project"**.
2.  **Conecte a sua conta do GitHub** e selecione o repositório do seu projeto.
3.  A Vercel irá detetar automaticamente que é um projeto Vite. Expanda a secção **"Build & Output Settings"** e configure:
    -   **Root Directory:** `frontend` (Isto diz à Vercel para olhar apenas para a pasta do frontend).

4.  Expanda a secção **"Environment Variables"** e adicione a variável de ambiente:
    -   **Chave:** `VITE_API_URL`
    -   **Valor:** Cole aqui a **URL do seu backend que copiou da Render**.

5.  Clique em **"Deploy"**. A Vercel irá construir e publicar a sua interface. Este processo também leva alguns minutos.

## Conclusão

Após a conclusão, a Vercel irá fornecer-lhe a URL pública da sua aplicação (ex: `https://sgac-braz.vercel.app`). Aceda a este link e o seu sistema estará a funcionar online, pronto para ser utilizado!

> **Nota sobre Planos Gratuitos:** Os serviços gratuitos da Render "dormem" após um período de inatividade. O primeiro acesso após algum tempo pode ser um pouco mais lento enquanto o servidor "acorda".