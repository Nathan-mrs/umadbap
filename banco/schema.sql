-- =====================================================================
-- UMADBAP — banco de dados de inscrições e pedidos de camisas
-- Postgres (Supabase). Cole tudo no "SQL Editor" do Supabase e rode uma vez.
-- Pode rodar de novo sem quebrar: tudo usa "if not exists" / "or replace".
--
-- Capacidade: 3 mil inscrições (ou 30 mil) é pouco para o Postgres. Os índices
-- abaixo mantêm buscas e relatórios instantâneos mesmo com centenas de milhares de linhas.
--
-- Segurança: o site NUNCA fala direto com o banco. Só as funções da Netlify,
-- com a chave secreta, gravam — e só pelas funções criar_inscricao / criar_pedido.
-- RLS ligado e sem políticas = ninguém de fora lê nem escreve nada.
-- =====================================================================

-- ---------- configuração (abrir/fechar inscrições e vendas pelo painel) ----------
create table if not exists public.configuracao (
  id               smallint primary key default 1 check (id = 1),  -- uma linha só
  inscricoes_abertas boolean not null default true,
  vendas_abertas     boolean not null default true,
  atualizado_em    timestamptz not null default now()
);
insert into public.configuracao (id) values (1) on conflict (id) do nothing;

-- ---------- inscrições ----------
create table if not exists public.inscricoes (
  id                   bigint generated always as identity primary key,
  codigo               text not null unique,                      -- ex.: INS-7KQ2MX (mostrado à pessoa)
  tipo                 text not null check (tipo in ('individual', 'caravana')),
  responsavel_nome     text not null check (char_length(responsavel_nome) between 3 and 120),
  responsavel_telefone text not null check (responsavel_telefone ~ '^[0-9]{10,11}$'),
  cidade               text not null check (char_length(cidade) between 2 and 80),
  campo                text not null check (char_length(campo) between 2 and 120),
  caravana_nome        text check (char_length(caravana_nome) <= 120),
  total_participantes  int  not null check (total_participantes between 1 and 500),
  -- controle da equipe
  status               text not null default 'pendente' check (status in ('pendente', 'confirmada', 'cancelada')),
  pago                 boolean not null default false,
  observacao_interna   text,
  -- técnico
  idempotency_key      uuid unique,                               -- evita duplicar se a pessoa tocar 2x
  consentimento_em     timestamptz not null default now(),
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now()
);

create table if not exists public.inscricao_participantes (
  id           bigint generated always as identity primary key,
  inscricao_id bigint not null references public.inscricoes (id) on delete cascade,
  nome         text not null check (char_length(nome) between 3 and 120),
  idade        smallint not null check (idade between 1 and 120),
  presente     boolean not null default false,                    -- check-in no dia
  criado_em    timestamptz not null default now()
);

create index if not exists inscricoes_criado_idx      on public.inscricoes (criado_em desc);
create index if not exists inscricoes_campo_idx       on public.inscricoes (lower(campo));
create index if not exists inscricoes_cidade_idx      on public.inscricoes (lower(cidade));
create index if not exists inscricoes_telefone_idx    on public.inscricoes (responsavel_telefone);
create index if not exists inscricoes_status_idx      on public.inscricoes (status);
create index if not exists participantes_inscricao_idx on public.inscricao_participantes (inscricao_id);
create index if not exists participantes_nome_idx     on public.inscricao_participantes (lower(nome));

-- ---------- pedidos de camisas ----------
create table if not exists public.pedidos (
  id                bigint generated always as identity primary key,
  codigo            text not null unique,                         -- ex.: CAM-P3H9TZ
  tipo              text not null check (tipo in ('individual', 'caravana')),
  comprador_nome    text not null check (char_length(comprador_nome) between 3 and 120),
  comprador_telefone text not null check (comprador_telefone ~ '^[0-9]{10,11}$'),
  cidade            text not null check (char_length(cidade) between 2 and 80),
  campo             text not null check (char_length(campo) between 2 and 120),
  caravana_nome     text check (char_length(caravana_nome) <= 120),
  observacao        text check (char_length(observacao) <= 500),
  total_pecas       int  not null check (total_pecas between 1 and 2000),
  -- controle da equipe
  status            text not null default 'pendente' check (status in ('pendente', 'pago', 'entregue', 'cancelado')),
  observacao_interna text,
  -- técnico
  idempotency_key   uuid unique,
  consentimento_em  timestamptz not null default now(),
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);

create table if not exists public.pedido_itens (
  id         bigint generated always as identity primary key,
  pedido_id  bigint not null references public.pedidos (id) on delete cascade,
  modelo     text not null check (char_length(modelo) between 1 and 40),
  genero     text not null check (genero in ('masculina', 'feminina')),
  tamanho    text not null check (tamanho in ('P', 'M', 'G', 'GG', 'XG')),
  quantidade int  not null check (quantidade between 1 and 500),
  unique (pedido_id, modelo, genero, tamanho)
);

create index if not exists pedidos_criado_idx   on public.pedidos (criado_em desc);
create index if not exists pedidos_campo_idx    on public.pedidos (lower(campo));
create index if not exists pedidos_telefone_idx on public.pedidos (comprador_telefone);
create index if not exists pedidos_status_idx   on public.pedidos (status);
create index if not exists itens_pedido_idx     on public.pedido_itens (pedido_id);

-- ---------- atualizado_em automático ----------
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists inscricoes_atualizado on public.inscricoes;
create trigger inscricoes_atualizado before update on public.inscricoes
  for each row execute function public.tocar_atualizado_em();
drop trigger if exists pedidos_atualizado on public.pedidos;
create trigger pedidos_atualizado before update on public.pedidos
  for each row execute function public.tocar_atualizado_em();

-- ---------- código curto e legível (sem 0/O, 1/I) ----------
create or replace function public.gerar_codigo(prefixo text)
returns text language sql volatile set search_path = '' as $$
  select prefixo || '-' || string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 6);
$$;

-- ---------- gravação: inscrição (tudo ou nada, numa transação) ----------
create or replace function public.criar_inscricao(dados jsonb, chave uuid default null)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_id bigint;
  v_codigo text;
  v_total int := coalesce(jsonb_array_length(dados -> 'participantes'), 0);
  v_tentativa int := 0;
begin
  -- mesmo envio repetido (internet caiu, toque duplo): devolve o código já criado
  if chave is not null then
    select codigo into v_codigo from public.inscricoes where idempotency_key = chave;
    if found then return jsonb_build_object('codigo', v_codigo, 'repetido', true); end if;
  end if;

  if not (select inscricoes_abertas from public.configuracao where id = 1) then
    raise exception 'inscricoes_encerradas';
  end if;
  if v_total < 1 then raise exception 'sem_participantes'; end if;

  loop
    begin
      insert into public.inscricoes
        (codigo, tipo, responsavel_nome, responsavel_telefone, cidade, campo, caravana_nome, total_participantes, idempotency_key)
      values
        (public.gerar_codigo('INS'), dados ->> 'tipo', dados #>> '{responsavel,nome}', dados #>> '{responsavel,telefone}',
         dados ->> 'cidade', dados ->> 'campo', nullif(dados ->> 'caravana', ''), v_total, chave)
      returning id, codigo into v_id, v_codigo;
      exit;
    exception when unique_violation then
      -- ou a mesma chave chegou ao mesmo tempo, ou o código sorteado já existia
      if chave is not null then
        select codigo into v_codigo from public.inscricoes where idempotency_key = chave;
        if found then return jsonb_build_object('codigo', v_codigo, 'repetido', true); end if;
      end if;
      v_tentativa := v_tentativa + 1;
      if v_tentativa >= 5 then raise; end if;
    end;
  end loop;

  insert into public.inscricao_participantes (inscricao_id, nome, idade)
  select v_id, p ->> 'nome', (p ->> 'idade')::smallint
  from jsonb_array_elements(dados -> 'participantes') as p;

  return jsonb_build_object('codigo', v_codigo);
end $$;

-- ---------- gravação: pedido de camisas ----------
create or replace function public.criar_pedido(dados jsonb, chave uuid default null)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_id bigint;
  v_codigo text;
  v_total int;
  v_tentativa int := 0;
begin
  if chave is not null then
    select codigo into v_codigo from public.pedidos where idempotency_key = chave;
    if found then return jsonb_build_object('codigo', v_codigo, 'repetido', true); end if;
  end if;

  if not (select vendas_abertas from public.configuracao where id = 1) then
    raise exception 'vendas_encerradas';
  end if;

  select coalesce(sum((i ->> 'quantidade')::int), 0) into v_total
  from jsonb_array_elements(dados -> 'itens') as i;
  if v_total < 1 then raise exception 'sem_itens'; end if;

  loop
    begin
      insert into public.pedidos
        (codigo, tipo, comprador_nome, comprador_telefone, cidade, campo, caravana_nome, observacao, total_pecas, idempotency_key)
      values
        (public.gerar_codigo('CAM'), dados ->> 'tipo', dados #>> '{comprador,nome}', dados #>> '{comprador,telefone}',
         dados ->> 'cidade', dados ->> 'campo', nullif(dados ->> 'caravana', ''), nullif(dados ->> 'observacao', ''), v_total, chave)
      returning id, codigo into v_id, v_codigo;
      exit;
    exception when unique_violation then
      if chave is not null then
        select codigo into v_codigo from public.pedidos where idempotency_key = chave;
        if found then return jsonb_build_object('codigo', v_codigo, 'repetido', true); end if;
      end if;
      v_tentativa := v_tentativa + 1;
      if v_tentativa >= 5 then raise; end if;
    end;
  end loop;

  insert into public.pedido_itens (pedido_id, modelo, genero, tamanho, quantidade)
  select v_id, i ->> 'modelo', i ->> 'genero', i ->> 'tamanho', (i ->> 'quantidade')::int
  from jsonb_array_elements(dados -> 'itens') as i;

  return jsonb_build_object('codigo', v_codigo);
end $$;

-- ---------- relatórios para a equipe (abra no Table Editor ou exporte CSV) ----------

-- quantas camisas produzir: por modelo, modelagem e tamanho
create or replace view public.relatorio_camisas with (security_invoker = true) as
select i.modelo, i.genero, i.tamanho, sum(i.quantidade)::int as quantidade
from public.pedido_itens i
join public.pedidos p on p.id = i.pedido_id
where p.status <> 'cancelado'
group by i.modelo, i.genero, i.tamanho
order by i.modelo, i.genero, array_position(array['P','M','G','GG','XG'], i.tamanho);

-- inscritos por campo / cidade
create or replace view public.relatorio_inscricoes_por_campo with (security_invoker = true) as
select campo, cidade,
       count(*)::int as inscricoes,
       sum(total_participantes)::int as pessoas,
       count(*) filter (where pago)::int as inscricoes_pagas
from public.inscricoes
where status <> 'cancelada'
group by campo, cidade
order by pessoas desc;

-- lista completa de participantes (para check-in e crachás)
create or replace view public.lista_participantes with (security_invoker = true) as
select ins.codigo, ins.tipo, ins.caravana_nome, ins.campo, ins.cidade,
       pa.nome, pa.idade, pa.presente,
       ins.responsavel_nome, ins.responsavel_telefone, ins.status, ins.pago, ins.criado_em
from public.inscricao_participantes pa
join public.inscricoes ins on ins.id = pa.inscricao_id
order by ins.campo, ins.codigo, pa.id;

-- pedidos com os itens em uma linha (para conferência e entrega)
create or replace view public.lista_pedidos with (security_invoker = true) as
select p.codigo, p.tipo, p.comprador_nome, p.comprador_telefone, p.campo, p.cidade, p.caravana_nome,
       p.total_pecas, p.status, p.criado_em,
       string_agg(i.quantidade || '× ' || i.genero || ' ' || i.tamanho, ', '
                  order by i.genero, array_position(array['P','M','G','GG','XG'], i.tamanho)) as itens
from public.pedidos p
join public.pedido_itens i on i.pedido_id = p.id
group by p.id
order by p.criado_em desc;

-- números gerais
create or replace view public.resumo with (security_invoker = true) as
select
  (select count(*) from public.inscricoes where status <> 'cancelada')::int                         as inscricoes,
  (select coalesce(sum(total_participantes), 0) from public.inscricoes where status <> 'cancelada')::int as pessoas_inscritas,
  (select count(*) from public.inscricoes where tipo = 'caravana' and status <> 'cancelada')::int    as caravanas,
  (select count(*) from public.pedidos where status <> 'cancelado')::int                            as pedidos_camisa,
  (select coalesce(sum(total_pecas), 0) from public.pedidos where status <> 'cancelado')::int       as camisas;

-- ---------- segurança ----------
alter table public.configuracao            enable row level security;
alter table public.inscricoes              enable row level security;
alter table public.inscricao_participantes enable row level security;
alter table public.pedidos                 enable row level security;
alter table public.pedido_itens            enable row level security;
-- (sem políticas de propósito: o público não acessa nada; a chave secreta ignora o RLS)

revoke all on public.configuracao, public.inscricoes, public.inscricao_participantes,
              public.pedidos, public.pedido_itens from anon, authenticated;
revoke all on public.relatorio_camisas, public.relatorio_inscricoes_por_campo,
              public.lista_participantes, public.lista_pedidos, public.resumo from anon, authenticated;

revoke execute on function public.criar_inscricao(jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.criar_pedido(jsonb, uuid)    from public, anon, authenticated;
revoke execute on function public.gerar_codigo(text)           from public, anon, authenticated;
grant  execute on function public.criar_inscricao(jsonb, uuid) to service_role;
grant  execute on function public.criar_pedido(jsonb, uuid)    to service_role;
grant  execute on function public.gerar_codigo(text)           to service_role;
