-- EU Exam Practice initial schema.
-- Apply in Supabase SQL Editor. Review before production use.

create extension if not exists pgcrypto;
create schema if not exists private;

create type public.app_role as enum ('candidate','admin','super_admin');
create type public.exam_status as enum ('draft','published','archived');
create type public.attempt_status as enum ('in_progress','submitted','abandoned');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_language text not null default 'en' check (preferred_language in ('en','fr')),
  created_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'candidate',
  primary key(user_id,role)
);
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title_en text not null, title_fr text,
  grade text, field text, description_en text, description_fr text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.exam_sections (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  code text not null, title_en text not null, title_fr text,
  duration_minutes integer not null check(duration_minutes>0),
  question_count integer not null check(question_count>0),
  sequence integer not null,
  unique(competition_id,code)
);
create table public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  title_en text not null, title_fr text, description_en text, description_fr text,
  status public.exam_status not null default 'draft',
  created_at timestamptz not null default now()
);
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.exam_sections(id) on delete cascade,
  topic text, difficulty text,
  question_type text not null default 'mcq',
  content_en text not null, content_fr text,
  options_en jsonb not null, options_fr jsonb,
  explanation_en text, explanation_fr text,
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.exam_questions (
  exam_id uuid not null references public.mock_exams(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  sequence integer not null,
  primary key(exam_id,question_id),
  unique(exam_id,sequence)
);
-- This schema is not exposed through the Supabase Data API.
create table private.question_answer_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correct_option_index integer not null check(correct_option_index>=0),
  explanation text,
  updated_at timestamptz not null default now()
);
create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.mock_exams(id),
  status public.attempt_status not null default 'in_progress',
  language text not null default 'en' check(language in ('en','fr')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(7,2), max_score numeric(7,2),
  created_at timestamptz not null default now()
);
create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  selected_option_index integer,
  answered_at timestamptz not null default now(),
  unique(attempt_id,question_id)
);
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  consent_type text not null,
  consent_value jsonb not null,
  policy_version text not null,
  recorded_at timestamptz not null default now()
);

create index idx_attempts_user_started on public.exam_attempts(user_id,started_at desc);
create index idx_answers_attempt on public.attempt_answers(attempt_id);
create index idx_questions_section on public.questions(section_id);

create or replace function public.has_role(required_role public.app_role)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.user_roles
   where user_id=(select auth.uid()) and role=required_role);
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.user_roles
   where user_id=(select auth.uid()) and role in ('admin','super_admin'));
$$;
revoke all on function public.has_role(public.app_role) from public;
revoke all on function public.is_admin() from public;
grant execute on function public.has_role(public.app_role),public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.competitions enable row level security;
alter table public.exam_sections enable row level security;
alter table public.mock_exams enable row level security;
alter table public.questions enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.consent_records enable row level security;

create policy "profile_select_own_or_admin" on public.profiles for select to authenticated
using(id=(select auth.uid()) or public.is_admin());
create policy "profile_update_own" on public.profiles for update to authenticated
using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy "profile_admin_manage" on public.profiles for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create policy "role_select_self_or_admin" on public.user_roles for select to authenticated
using(user_id=(select auth.uid()) or public.is_admin());
-- Role writes are intentionally not granted to client roles. Assign admins via trusted SQL/admin tooling.

create policy "competition_read_published" on public.competitions for select to anon,authenticated
using(is_published or public.is_admin());
create policy "competition_admin_write" on public.competitions for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create policy "sections_read_published" on public.exam_sections for select to anon,authenticated
using(public.is_admin() or exists(select 1 from public.competitions c where c.id=competition_id and c.is_published));
create policy "sections_admin_write" on public.exam_sections for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create policy "mock_read_published" on public.mock_exams for select to anon,authenticated
using(status='published' or public.is_admin());
create policy "mock_admin_write" on public.mock_exams for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create policy "questions_read_active" on public.questions for select to anon,authenticated
using((is_active and exists(select 1 from public.exam_sections s join public.competitions c on c.id=s.competition_id where s.id=section_id and c.is_published)) or public.is_admin());
create policy "questions_admin_write" on public.questions for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create policy "exam_questions_read_published" on public.exam_questions for select to anon,authenticated
using(public.is_admin() or exists(select 1 from public.mock_exams e where e.id=exam_id and e.status='published'));
create policy "exam_questions_admin_write" on public.exam_questions for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create policy "attempt_select_own" on public.exam_attempts for select to authenticated
using(user_id=(select auth.uid()) or public.is_admin());
create policy "attempt_insert_own" on public.exam_attempts for insert to authenticated
with check(user_id=(select auth.uid()) and status='in_progress' and score is null and submitted_at is null);
create policy "attempt_update_own_in_progress" on public.exam_attempts for update to authenticated
using(user_id=(select auth.uid()) and status='in_progress')
with check(user_id=(select auth.uid()) and status='in_progress' and score is null and submitted_at is null);

create policy "answers_select_own" on public.attempt_answers for select to authenticated
using(exists(select 1 from public.exam_attempts a where a.id=attempt_id and (a.user_id=(select auth.uid()) or public.is_admin())));
create policy "answers_write_own_in_progress" on public.attempt_answers for all to authenticated
using(exists(select 1 from public.exam_attempts a where a.id=attempt_id and a.user_id=(select auth.uid()) and a.status='in_progress'))
with check(exists(select 1 from public.exam_attempts a where a.id=attempt_id and a.user_id=(select auth.uid()) and a.status='in_progress'));

create policy "consent_select_own" on public.consent_records for select to authenticated
using(user_id=(select auth.uid()) or public.is_admin());
create policy "consent_insert_own" on public.consent_records for insert to authenticated
with check(user_id=(select auth.uid()));

revoke all on schema private from public,anon,authenticated;
revoke all on all tables in schema private from public,anon,authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 insert into public.profiles(id,display_name)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''));
 insert into public.user_roles(user_id,role) values(new.id,'candidate');
 return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- After registering the owner account, promote it manually in SQL Editor:
-- insert into public.user_roles(user_id,role)
-- select id,'super_admin'::public.app_role from auth.users
-- where email='YOUR_ADMIN_EMAIL'
-- on conflict do nothing;
