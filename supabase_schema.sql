-- Run this in Supabase SQL editor before deploying

create table survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  group_size int not null,
  answers jsonb not null
);

-- Allow anonymous inserts from the public survey form
alter table survey_responses enable row level security;

create policy "Allow public inserts"
on survey_responses
for insert
to anon
with check (true);
