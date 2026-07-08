-- Run once in the Supabase SQL editor before loading the knowledge base.

create extension if not exists vector;

create table if not exists rules (
    id text primary key,
    source text not null,
    citation text not null,
    title text not null,
    text text not null,
    clause_category text not null,
    embedding vector(1536)  -- text-embedding-3-small
);

create index if not exists rules_clause_category_idx on rules (clause_category);

-- Per-category similarity search used by the retriever.
create or replace function match_rules(
    query_embedding vector(1536),
    category text,
    match_count int default 4
)
returns table (
    id text,
    citation text,
    title text,
    text text,
    clause_category text,
    similarity float
)
language sql stable
as $$
    select
        r.id, r.citation, r.title, r.text, r.clause_category,
        1 - (r.embedding <=> query_embedding) as similarity
    from rules r
    where r.clause_category = category
    order by r.embedding <=> query_embedding
    limit match_count;
$$;
