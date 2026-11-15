# Banco de dados da UMADBAP — como ligar

Enquanto o banco não estiver ligado, os formulários funcionam em **modo demonstração**: a pessoa vê a confirmação com um aviso, e nada é salvo de verdade. Ligar o banco leva uns 15 minutos e não exige mexer no código.

## Como funciona

```
celular da pessoa ──► site (CDN da Netlify, estático)
        │
        └─ envio do formulário ──► /api/inscricoes ou /api/pedidos  (funções da Netlify)
                                        │  valida, limita robôs, evita duplicados
                                        ▼
                                  Supabase (Postgres)
```

- As páginas são arquivos estáticos espalhados pelo mundo. Pico de acesso não derruba o site.
- Só o envio passa pelo servidor. Cada envio leva menos de 1 segundo, e cada pessoa (IP) tem um limite de 10 envios por minuto.
- O plano gratuito do Supabase aguenta **muito mais** que 3 mil inscrições: são 500 MB, e cada inscrição ocupa menos de 1 KB.

## Passo a passo

1. **Criar o projeto.** Em supabase.com, crie uma conta e um projeto chamado `umadbap`. Escolha a região São Paulo (`sa-east-1`) e anote a senha do banco.
2. **Criar as tabelas.** No menu **SQL Editor**, clique em **New query**, cole todo o conteúdo de `schema.sql` e clique em **Run**. A resposta esperada é "Success. No rows returned".
3. **Pegar as chaves.** Em **Project Settings → API Keys**, copie:
   - a **Project URL** (`https://xxxx.supabase.co`), que fica em **Project Settings → Data API**;
   - a **Secret key** (`sb_secret_...`). Se o painel mostrar só as chaves antigas, use a `service_role`.
   - ⚠️ A chave secreta **nunca** vai no código nem em `config.js`. Ela fica só na Netlify.
4. **Configurar a Netlify.** No painel do site (umadbap.netlify.app), vá em **Site configuration → Environment variables** e adicione:

   | Nome | Valor |
   |---|---|
   | `SUPABASE_URL` | a Project URL |
   | `SUPABASE_SECRET_KEY` | a secret key |

5. **Publicar de novo.** Publique sempre a partir da pasta `Site Umadbap/`, onde fica o `netlify.toml`, e não da pasta `publico/`. Assim as funções vão junto.
6. **Testar.** Faça uma inscrição pelo site. O aviso de "modo demonstração" não deve aparecer, e a inscrição deve estar em **Table Editor → inscricoes**.

## Usando no dia a dia

O que a equipe faz e onde fica, no Supabase:

| Tarefa | Onde |
|---|---|
| Ver os números gerais | Table Editor → `resumo` |
| Saber quantas camisas mandar fazer | `relatorio_camisas` |
| Ver inscritos por campo ou cidade | `relatorio_inscricoes_por_campo` |
| Ver a lista de participantes (check-in e crachás) | `lista_participantes`. O botão **Export → CSV** abre no Excel. |
| Conferir os pedidos de camisa | `lista_pedidos` |
| Confirmar o pagamento de uma inscrição | tabela `inscricoes`: marque `pago` e mude `status` para `confirmada` |
| Atualizar um pedido de camisa | tabela `pedidos`: mude `status` para `pago`, `entregue` ou `cancelado` |
| **Fechar as inscrições ou as vendas** | tabela `configuracao`: desmarque `inscricoes_abertas` ou `vendas_abertas`. Vale na hora. |

Para achar alguém pelo código (ex.: `INS-7KQ2MX`), use o filtro da coluna `codigo`.

## Mudando informações do site

Datas, local, valores, prazo, WhatsApp da equipe e links do Drive ficam todos em `publico/js/config.js`. Os campos que estiverem como `null` aparecem no site como "a confirmar".

Para adicionar um modelo novo de camisa, são dois lugares, com o mesmo `id`:
- `camisas.modelos` em `config.js`;
- a lista `MODELOS` em `netlify/functions/pedidos.mjs`.

## Segurança

- O RLS (Row Level Security) está ligado em todas as tabelas e não há nenhuma política pública. Ninguém de fora consegue ler nem gravar.
- A única forma de gravar é pelas funções `criar_inscricao` e `criar_pedido`, que só a chave secreta pode chamar.
- Os dados são validados duas vezes: no navegador e de novo no servidor, que tem a palavra final.
- O campo invisível "site" pega robôs de spam.
- A chave de envio (Idempotency-Key) impede inscrições duplicadas quando a internet cai no meio do envio.
