# 📘 SGAC - Sistema de Gestão de Atendimentos (CREAS)

## Documentação Técnica & Arquitetura de Backend

**Versão:** 8.0.0 (Enterprise-Grade)
**Data:** Fevereiro/2026
**Arquitetura:** Elite Fullstack (Node.js + Fastify + Prisma + Neon)

---

## 1. 🎯 Resumo Executivo

O **SGAC** é uma plataforma de alta performance desenvolvida para modernizar, assegurar e agilizar o acompanhamento de famílias e indivíduos em situação de vulnerabilidade social.

Diferente de sistemas legados, esta arquitetura foi desenhada com **Privacidade por Design (Privacy by Design)**, garantindo que dados sensíveis (CPF, Endereço, Telefones) sejam criptografados no banco de dados, protegendo a instituição contra vazamentos e adequando-se rigorosamente à **LGPD**.

### Principais Ganhos:

1. **Segurança Militar:** Criptografia AES-256-GCM para dados pessoais.
2. **Automação de RMA:** Geração do Relatório Mensal de Atendimentos em segundos (processo que levava dias).
3. **Vigilância Socioassistencial:** Mapa de calor e georreferenciamento de casos em tempo real.
4. **Auditoria Total:** Cada clique, visualização ou edição é registrado em um log imutável.

---

## 2. 🏗️ Stack Tecnológica (O Motor)

A escolha tecnológica priorizou **velocidade de resposta** e **baixo custo de infraestrutura** (Serverless).

| Camada | Tecnologia | Justificativa |
| --- | --- | --- |
| **Runtime** | **Node.js v20+** | Estabilidade LTS e performance assíncrona para I/O. |
| **Framework** | **Fastify v5** | Até 4x mais rápido que o Express. Menor overhead de memória. |
| **Database** | **PostgreSQL (Neon)** | Banco relacional robusto com arquitetura Serverless (escala sob demanda). |
| **ORM** | **Prisma** | Segurança de tipos (Type-Safe) e prevenção total contra *SQL Injection*. |
| **Validação** | **Zod** | Validação rigorosa de dados na entrada e saída (Schema-First). |
| **Cache** | **LRU-Cache** | Cache em memória para reduzir latência e custos de banco de dados. |
| **Criptografia** | **Node Crypto** | Biblioteca nativa para encriptação AES-256-GCM de alta performance. |

---

## 3. 🛡️ Segurança & Conformidade (LGPD)

Este é o pilar central do sistema. Nenhum dado sensível reside em texto plano no banco de dados.

### 3.1. Criptografia em Repouso (Encryption at Rest)

Utilizamos o algoritmo **AES-256-GCM** (Advanced Encryption Standard) com chaves rotativas.

* **Campos Criptografados:** Endereço (Logradouro, Complemento), Telefones, Contatos de Emergência.
* **Mecanismo:** Mesmo que um atacante obtenha o banco de dados (SQL Dump), os dados aparecerão como hash ilegível (ex: `a3f1:9d8a:...`). Apenas a aplicação com a chave mestra pode descriptografar para exibição.

### 3.2. Controle de Acesso (RBAC)

O sistema implementa Controle de Acesso Baseado em Funções (Role-Based Access Control) rigoroso:

* **Agente Social:** Vê apenas a triagem e acolhida.
* **Especialista:** Vê apenas os casos técnicos (PAEFI) sob sua responsabilidade (Segregação de Função).
* **Gerente:** Visão total para distribuição e monitoramento.
* **Auditor:** Acesso apenas de leitura aos logs e estatísticas, sem ver dados sensíveis dos usuários.

### 3.3. Trilha de Auditoria (Audit Logs)

Todas as ações críticas geram um registro forense contendo: `Quem`, `Quando`, `O Quê` (Valor Antigo vs Novo) e `Onde`.

* *Exemplo:* "Usuário X alterou o status do Caso Y de 'Em Acompanhamento' para 'Desligado'."

---

## 4. 🧩 Módulos Funcionais do Backend

### 4.1. Gestão de Casos & Triagem Inteligente

* **Entrada Unificada:** Suporta demanda espontânea, busca ativa e encaminhamentos de rede.
* **Cálculo de Urgência:** Algoritmo proprietário que define o "Peso de Urgência" (1 a 4) baseado em palavras-chave (ex: "Risco de Morte" = Peso 4).
* **Fila de Espera:** Ordenação automática por Gravidade > Data de Chegada.

### 4.2. PAF Eletrônico (Plano de Acompanhamento Familiar)

* **Versionamento:** Histórico completo de todas as alterações no plano.
* **Prazos:** Monitoramento automático de vencimento de objetivos e repactuação.

### 4.3. RMA Automático (Relatório Mensal de Atendimentos)

* **Compilação em Tempo Real:** O sistema varre todos os atendimentos, classifica por idade, gênero e violação, e preenche a matriz oficial do SUAS/MDS automaticamente.
* **Cache:** O resultado é armazenado em cache para evitar sobrecarga no banco em dias de fechamento.

### 4.4. Vigilância & Georreferenciamento

* **Integração Nominatim/OSM:** Converte endereços textuais em coordenadas (Lat/Long) automaticamente.
* **Mapa de Calor:** Identifica territórios com maior incidência de violações específicas (ex: Trabalho Infantil, Violência Doméstica).

### 4.5. Agenda & Grupos

* **Atividades Coletivas:** Gestão de presença em grupos/oficinas com geração automática de evolução individual para todos os participantes.
* **Agenda Unificada:** O técnico visualiza seus atendimentos individuais e atividades de grupo em uma única tela.

---

## 5. 🚀 Performance & Escalabilidade

### Otimizações Implementadas:

1. **Prisma Singleton:** Previne a exaustão do pool de conexões do banco de dados em ambientes Serverless.
2. **Fastify Schema Compilation:** Os schemas de validação (Zod) são compilados na inicialização, tornando a validação de JSON extremamente rápida.
3. **Silent Failures (Geo):** Se o serviço de mapas cair, o sistema continua funcionando (Degradação Graciosa).
4. **Background Logs:** A gravação de logs de auditoria não bloqueia a resposta ao usuário (Fire-and-Forget).

---

## 6. 📂 Estrutura de Diretórios (Clean Architecture)

```
backend/src
├── controllers/   # Regras de Entrada/Saída (HTTP)
├── services/      # Regras de Negócio Puras (Agnósticas de Framework)
├── routes/        # Definição de Endpoints e Schemas (Swagger)
├── lib/           # Configurações (Prisma, Cache, Crypto, ErrorHandler)
├── domain/        # Regras de Domínio Complexas (Cálculo de Urgência)
├── schemas/       # Contratos de Dados (Zod)
└── utils/         # Ferramentas Auxiliares (Geo, Formatadores)

```
