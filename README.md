# SGAC-BRAZ: Sistema de Gestão de Atendimentos do CREAS Brazlândia

Bem-vindo ao SGAC-BRAZ. Este documento contém todas as instruções necessárias para configurar, executar e gerir o projeto.

## 1. Visão Geral do Projeto

O SGAC-BRAZ é um sistema de informação full-stack desenhado para gerir o fluxo completo de atendimentos do CREAS Brazlândia, com uma API robusta em **Node.js/Fastify** e uma interface moderna em **React/Vite**.

---

## 2. Configuração do Ambiente (Primeira Vez)

Siga estes passos para configurar o projeto na sua máquina pela primeira vez.

### Pré-requisitos

-   **Node.js**: Versão 20 ou superior.
-   **npm**: Instalado juntamente com o Node.js.
-   **Git**: Para controlo de versão.
-   **Conta no GitHub**: Para hospedar o código.
-   **Conta no Supabase**: Para a base de dados PostgreSQL.

### Passo 2.1: Configurar o Backend

1.  **Navegue para a pasta `backend`** e instale as dependências:
    ```bash
    cd backend
    npm install
    ```
2.  **Crie e configure o ficheiro `.env`** com a sua `DATABASE_URL` do Supabase e um `JWT_SECRET` seguro.
3.  **Execute a Migração da Base de Dados**:
    ```bash
    npx prisma migrate dev
    ```

### Passo 2.2: Configurar o Frontend

1.  **Navegue para a pasta `frontend`** e instale as dependências:
    ```bash
    cd ../frontend
    npm install
    ```
2.  **Crie o ficheiro `.env.local`** na raiz da pasta `frontend` e adicione o seguinte conteúdo:
    ```env
    VITE_API_URL=http://localhost:3333
    ```

---

## 3. Controlo de Versão com Git e GitHub (Primeira Vez)

Siga estes passos para criar um repositório e enviar o seu projeto para o GitHub.

1.  **Crie um Novo Repositório no GitHub:**
    -   Vá ao [GitHub](https://github.com/new) e crie um novo repositório **privado**. Dê-lhe um nome (ex: `sgac-braz-creas`).
    -   **Não** adicione um `README`, `.gitignore` ou licença. Queremos um repositório "vazio".

2.  **Inicie o Git no seu Projeto Local:**
    -   Abra um terminal na **pasta raiz** do seu projeto (a que contém as pastas `backend` e `frontend`).
    -   Execute os seguintes comandos:
        ```bash
        git init -b main
        git add .
        git commit -m "Commit inicial do projeto SGAC-BRAZ"
        ```

3.  **Conecte e Envie o seu Projeto:**
    -   Na página do seu novo repositório no GitHub, copie os comandos da secção **"...or push an existing repository from the command line"**.
    -   Cole e execute esses comandos no seu terminal. Eles serão parecidos com isto:
        ```bash
        git remote add origin [https://github.com/SEU_UTILIZADOR/SEU_REPOSITORIO.git](https://github.com/SEU_UTILIZADOR/SEU_REPOSITORIO.git)
        git branch -M main
        git push -u origin main
        ```

Após estes passos, todo o seu código estará guardado de forma segura no GitHub.

---

## 4. Executando o Projeto

Para rodar a aplicação, você precisará de **dois terminais abertos** simultaneamente.

1.  **Terminal 1 (Backend):**
    ```bash
    cd backend
    npm run dev
    ```
2.  **Terminal 2 (Frontend):**
    ```bash
    cd frontend
    npm run dev
    ```
A aplicação estará acessível em `http://localhost:5173`.

---

## 5. Povoar a Base de Dados para Testes

Para testar a aplicação com dados simulados, execute o "seed script". **Atenção:** isto irá apagar todos os dados existentes.

1.  **Navegue para a pasta `backend`** no seu terminal.
2.  **Execute o comando:**
    ```bash
    npx prisma db seed
    ```
---

## 6. Comandos Úteis

-   **`npx prisma migrate dev`**: Para aplicar alterações do `schema.prisma` à base de dados.
-   **`npx prisma generate`**: Para forçar a atualização do cliente Prisma se encontrar erros de "tabela não encontrada".
-   **`npx prisma studio`**: Para abrir uma interface gráfica da sua base de dados no navegador.