-- Enable pgvector extension
create extension if not exists vector;

-- Stock embeddings table for similarity search
create table if not exists stock_embeddings (
  id bigserial primary key,
  ticker text not null unique,
  embedding vector(768),
  metadata jsonb,
  updated_at timestamptz default now()
);

-- IVFFlat index for fast cosine similarity queries
create index if not exists stock_embeddings_embedding_idx
  on stock_embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- RPC function for similarity search
create or replace function match_stocks(
  query_embedding text,
  match_count int default 5
)
returns table (
  ticker text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    se.ticker,
    1 - (se.embedding <=> query_embedding::vector) as similarity
  from stock_embeddings se
  order by se.embedding <=> query_embedding::vector
  limit match_count;
end;
$$;
