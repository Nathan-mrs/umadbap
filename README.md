
# UMADBAP — Site oficial

Site da **União de Mocidade das Assembleias de Deus do Baixo Parnaíba (UMADBAP)**: apresenta a mocidade e o Congresso anual, reúne os álbuns de fotos de cada culto e recebe pedidos de patrocínio. Ele também traz inscrições e pedidos de camisas, que ficam desligados entre um congresso e outro.

🔗 **No ar:** [umadbap.netlify.app](https://umadbap.netlify.app)

---

## Visão geral

| Página | O que faz | Situação |
|---|---|---|
| `index.html` | Página inicial com vídeo de abertura, "Quem somos" e a história do 8º Congresso (2026, Santa Quitéria — *"Eu trago as marcas de Cristo"*) contada pela rolagem | Ativa |
| `fotos.html` | Álbuns do congresso, um por culto, com link para a pasta no Google Drive | Ativa |
| `patrocinio.html` | Formas de apoiar e formulário que monta a mensagem pronta no WhatsApp | Ativa |
| `inscricao.html` | Inscrição **individual** ou de **caravana** (até 200 participantes) | Desligada até o próximo congresso |
| `camisas.html` | Pedido de camisas masculina/feminina, do P ao XG | Desligada até o próximo congresso |
| `alternativa/` | Versão alternativa do site, com menu "Congresso", páginas de edições, próximo congresso e "Quem somos" | Em avaliação |

## Tecnologias

- **Front-end:** HTML, CSS e JavaScript puros, **sem build e sem dependências**
- **Back-end:** funções serverless em Node.js (ES Modules), compatíveis com **Netlify Functions** e **Vercel**
- **Banco de dados:** **Supabase** (PostgreSQL), acessado pela API REST com funções RPC
- **Animações:** motor de rolagem *Sites Incríveis* (`sites-incriveis.js`), que funciona por atributos `data-fx-*`
- **Mídia:** imagens em WebP com vários tamanhos (640 → 2400px) e fontes próprias em WOFF2 (League Gothic e Alegreya)

## Arquitetura

```
celular da pessoa ──► site estático (CDN da Netlify/Vercel)
        │
        └─ envio do formulário ──► /api/inscricoes  ou  /api/pedidos   (funções serverless)
                                        │  valida, limita robôs, evita duplicados
                                        ▼
                                  Supabase (Postgres)
                                  criar_inscricao() / criar_pedido()
```

- As páginas são arquivos estáticos servidos por CDN, então um pico de acesso no dia do congresso não derruba o site.
- Só o envio dos formulários passa pelo servidor.
- O site **nunca** fala direto com o banco. A chave secreta fica apenas nas variáveis de ambiente.

## Estrutura de pastas

```
umadbap/
├── publico/                  # tudo que vai para o ar (pasta publicada)
│   ├── *.html                # páginas do site principal
│   ├── alternativa/          # versão alternativa do site
│   ├── css/                  # site.css, paginas.css, alternativa.css, sites-incriveis.css
│   ├── js/
│   │   ├── config.js         # ⭐ datas, valores, links, contato (edite aqui)
│   │   ├── dados.js          # envio dos formulários + modo demonstração
│   │   ├── comum.js          # comportamentos comuns às páginas
│   │   ├── inscricao.js      # formulário de inscrição
│   │   ├── camisas.js        # formulário de pedido de camisas
│   │   ├── patrocinio.js     # formulário → WhatsApp
│   │   ├── fotos.js          # monta os álbuns a partir do config.js
│   │   ├── site.js           # efeitos sob medida da página inicial
│   │   └── sites-incriveis.js# motor de animação por rolagem
│   ├── fotos/ videos/ fontes/ assets/
├── netlify/functions/        # API (Netlify)
│   ├── inscricoes.mjs        # POST /api/inscricoes
│   ├── pedidos.mjs           # POST /api/pedidos
│   └── _lib/
│       ├── db.mjs            # conexão com o Supabase (RPC)
│       └── validar.mjs       # validação e limpeza dos dados no servidor
├── api/                      # adaptadores para a Vercel (reutilizam as funções da Netlify)
├── banco/
│   ├── schema.sql            # tabelas, funções, relatórios e segurança
│   └── LEIA-ME.md            # passo a passo para ligar o banco
├── netlify.toml              # configuração da Netlify (publicação, funções, cabeçalhos)
└── vercel.json               # configuração equivalente para a Vercel
```

## Como rodar localmente

Como o site não tem etapa de build, basta servir a pasta `publico/`:

```bash
# só as páginas (formulários entram em modo demonstração)
npx serve publico
# ou
python3 -m http.server 8080 --directory publico
```

Para testar também as funções da API:

```bash
npm install -g netlify-cli
netlify dev
```

> Sem as variáveis do Supabase, a API responde `sem_banco` e o site entra em **modo demonstração** (explicado abaixo).

## Configurando o site para um novo congresso

Tudo que muda de um ano para o outro fica em **`publico/js/config.js`**:

```js
congresso: { edicao: "9º", data: null, local: null, tema: null },
inscricao: { aberta: false, valor: null, prazo: null, maxParticipantesCaravana: 200 },
camisas:   { aberta: false, valor: null, modelos: [ ... ] },
fotos:     { titulo: "...", albuns: [ { dia, periodo, capa, url } ] },
whatsapp:  "55DDDNUMERO",
```

- Campos com `null` aparecem no site como **"a confirmar"**, então o site nunca mostra um número inventado.
- `aberta: true` exibe o formulário. Com `false`, aparece o aviso "ainda não disponível".
- Os links da página inicial para Inscrição e Camisas estão comentados no `index.html`. É só descomentar quando abrir.
- **Modelo novo de camisa:** adicione o mesmo `id` em `camisas.modelos` (no `config.js`) **e** na lista `MODELOS` em `netlify/functions/pedidos.mjs`.
- **Álbuns de fotos:** troque os links do Google Drive. A pasta precisa estar como "Qualquer pessoa com o link pode ver".

## Banco de dados (Supabase)

O guia completo está em [`banco/LEIA-ME.md`](banco/LEIA-ME.md). Em resumo:

1. Crie um projeto no Supabase (região `sa-east-1`, São Paulo).
2. Rode todo o `banco/schema.sql` no **SQL Editor**. Ele pode ser rodado de novo sem quebrar nada.
3. Configure as variáveis de ambiente na Netlify (ou Vercel):

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SECRET_KEY` | chave secreta `sb_secret_...` (ou `SUPABASE_SERVICE_ROLE_KEY`, no formato antigo) |

4. Publique de novo e faça uma inscrição de teste.

### Tabelas e relatórios

| Objeto | Para quê |
|---|---|
| `inscricoes` + `inscricao_participantes` | Inscrições e seus participantes, com campo de check-in (`presente`) |
| `pedidos` + `pedido_itens` | Pedidos de camisas por modelo, modelagem e tamanho |
| `configuracao` | Abre e fecha inscrições e vendas na hora, direto pelo painel |
| `resumo` | Números gerais |
| `relatorio_camisas` | Quantas camisas produzir |
| `relatorio_inscricoes_por_campo` | Inscritos por campo/igreja e cidade |
| `lista_participantes` | Lista para check-in e crachás (exporta em CSV) |
| `lista_pedidos` | Pedidos com os itens em uma linha, para conferência e entrega |

Cada registro recebe um código curto e legível, sem caracteres ambíguos como 0/O e 1/I: `INS-7KQ2MX` para inscrições e `CAM-P3H9TZ` para camisas.

## API

| Rota | Método | Corpo |
|---|---|---|
| `/api/inscricoes` | `POST` | `tipo`, `responsavel {nome, telefone}`, `cidade`, `campo`, `caravana`, `participantes [{nome, idade}]`, `consentimento` |
| `/api/pedidos` | `POST` | `tipo`, `comprador {nome, telefone}`, `cidade`, `campo`, `caravana`, `observacao`, `itens [{modelo, genero, tamanho, quantidade}]`, `consentimento` |

Respostas: `201` com `{ codigo }` · `422` para dados recusados, com `{ mensagem }` · `429` para envios demais · `503` com `{ erro: "sem_banco" }` · `502` para falha no banco.

O cabeçalho `Idempotency-Key` (UUID) garante que reenviar o mesmo formulário não cria registro duplicado.

## Modo demonstração

Enquanto o banco não está ligado (a API não existe ou responde `sem_banco`), o `dados.js`:

- gera um código local e guarda o envio no `localStorage` do aparelho;
- mostra a confirmação com um aviso de que é uma demonstração.

Assim dá para apresentar e testar o site sem infraestrutura nenhuma. Quando o banco é ligado, nada no código precisa mudar.

## Segurança e confiabilidade

- **RLS ligado** em todas as tabelas, sem nenhuma política pública. A gravação só acontece pelas funções `criar_inscricao` e `criar_pedido`, que apenas a chave secreta pode executar.
- **Validação dupla:** primeiro no navegador, depois no servidor (`validar.mjs`), que limpa os textos, remove tags e caracteres de controle e descarta campos inesperados.
- **Transações:** cada inscrição ou pedido é gravado inteiro, ou não é gravado.
- **Anti-spam:** campo invisível ("honeypot") contra robôs, verificação de origem e limite de **10 envios por minuto por IP**.
- **Retentativas** com espera crescente (0,8s → 1,6s → 3,2s) quando a internet oscila.
- **Cabeçalhos de segurança** (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) e cache longo para fotos, vídeos e fontes.
- **Consentimento** obrigatório para o uso dos dados, com data registrada (LGPD).

## Desempenho e acessibilidade

- **Modo leve** em celulares e telas de toque: pula a animação de entrada da logo e os efeitos mais pesados.
- Respeita `prefers-reduced-motion`, para quem prefere menos animação.
- Imagens responsivas em WebP e fontes locais, sem depender de serviços externos.

## Deploy

**Netlify (principal):** publique a **raiz do repositório**, não a pasta `publico/`, para que o `netlify.toml` e as funções sejam incluídos.

**Vercel:** o `vercel.json` publica a pasta `publico/`, e os arquivos em `api/` reutilizam as mesmas funções da Netlify.

## Créditos

- Desenvolvimento: [Nathan Moraes Almeida](https://github.com/Nathan-mrs)
- Motor de animação *Sites Incríveis*: © 2026 Enzo Barbatto — Sparo Automações, usado conforme a licença dele
- Fotos e vídeos: equipe de mídia da UMADBAP

---

**Contato:** [Instagram @umadbap](https://www.instagram.com/umadbap/) · [TikTok](https://www.tiktok.com/@umadbapoficial) · [YouTube](https://www.youtube.com/@umadbap)
