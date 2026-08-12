-- Run this once in Supabase Dashboard > SQL Editor.
-- Create the admin user first in Authentication > Users, then add that user's UUID below.
create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  visitor_name text not null default 'Website visitor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.support_conversations add column if not exists is_blocked boolean not null default false;
alter table public.support_conversations add column if not exists unread_count integer not null default 0;

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role text not null check (sender_role in ('visitor', 'admin')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
alter table public.support_messages add column if not exists image_url text;
alter table public.support_messages add column if not exists image_path text;
alter table public.support_messages add column if not exists audio_url text;
alter table public.support_messages add column if not exists audio_path text;
alter table public.support_messages drop constraint if exists support_messages_body_check;
alter table public.support_messages add constraint support_messages_body_check check ((char_length(body) between 1 and 4000) or image_url is not null or audio_url is not null);

create table if not exists public.support_typing_status (
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender_role text not null check (sender_role in ('visitor', 'admin')),
  is_typing boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, sender_role)
);

create table if not exists public.support_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.support_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_support_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.support_admins where user_id = auth.uid()) $$;

create or replace function public.touch_support_conversation()
returns trigger language plpgsql security definer set search_path = public
as $$ begin update public.support_conversations set updated_at = now(), unread_count = case when new.sender_role = 'visitor' then unread_count + 1 else 0 end where id = new.conversation_id; return new; end $$;

drop trigger if exists support_message_activity on public.support_messages;
create trigger support_message_activity after insert on public.support_messages for each row execute function public.touch_support_conversation();

alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_typing_status enable row level security;
alter table public.support_admins enable row level security;
alter table public.support_push_subscriptions enable row level security;

drop policy if exists "Visitors read their conversation" on public.support_conversations;
drop policy if exists "Visitors create their conversation" on public.support_conversations;
drop policy if exists "Support reads messages" on public.support_messages;
drop policy if exists "Visitors send their messages" on public.support_messages;
drop policy if exists "Admins send replies" on public.support_messages;
drop policy if exists "Admins delete messages" on public.support_messages;
drop policy if exists "Admins update conversations" on public.support_conversations;
drop policy if exists "Admins delete conversations" on public.support_conversations;
drop policy if exists "Support reads typing status" on public.support_typing_status;
drop policy if exists "Visitors update typing status" on public.support_typing_status;
drop policy if exists "Admins update typing status" on public.support_typing_status;

create policy "Visitors read their conversation" on public.support_conversations for select to authenticated using ((select auth.uid()) = owner_id or (select public.is_support_admin()));
create policy "Visitors create their conversation" on public.support_conversations for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Support reads messages" on public.support_messages for select to authenticated using ((select public.is_support_admin()) or exists (select 1 from public.support_conversations c where c.id = conversation_id and c.owner_id = auth.uid()));
create policy "Visitors send their messages" on public.support_messages for insert to authenticated with check (sender_role = 'visitor' and sender_id = (select auth.uid()) and exists (select 1 from public.support_conversations c where c.id = conversation_id and c.owner_id = auth.uid() and not c.is_blocked));
create policy "Admins send replies" on public.support_messages for insert to authenticated with check (sender_role = 'admin' and sender_id = (select auth.uid()) and (select public.is_support_admin()));
create policy "Admins delete messages" on public.support_messages for delete to authenticated using ((select public.is_support_admin()));
create policy "Admins update conversations" on public.support_conversations for update to authenticated using ((select public.is_support_admin())) with check ((select public.is_support_admin()));
create policy "Admins delete conversations" on public.support_conversations for delete to authenticated using ((select public.is_support_admin()));
create policy "Support reads typing status" on public.support_typing_status for select to authenticated using ((select public.is_support_admin()) or exists (select 1 from public.support_conversations c where c.id = conversation_id and c.owner_id = auth.uid()));
create policy "Visitors update typing status" on public.support_typing_status for all to authenticated using (sender_role = 'visitor' and exists (select 1 from public.support_conversations c where c.id = conversation_id and c.owner_id = auth.uid())) with check (sender_role = 'visitor' and exists (select 1 from public.support_conversations c where c.id = conversation_id and c.owner_id = auth.uid()));
create policy "Admins update typing status" on public.support_typing_status for all to authenticated using (sender_role = 'admin' and (select public.is_support_admin())) with check (sender_role = 'admin' and (select public.is_support_admin()));
drop policy if exists "Admins manage their push subscriptions" on public.support_push_subscriptions;
create policy "Admins manage their push subscriptions" on public.support_push_subscriptions for all to authenticated using (admin_id = (select auth.uid()) and (select public.is_support_admin())) with check (admin_id = (select auth.uid()) and (select public.is_support_admin()));

insert into storage.buckets (id, name, public) values ('support-uploads', 'support-uploads', true) on conflict (id) do update set public = true;
drop policy if exists "Support users upload chat images" on storage.objects;
drop policy if exists "Support users view chat images" on storage.objects;
create policy "Support users upload chat images" on storage.objects for insert to authenticated with check (bucket_id = 'support-uploads');
create policy "Support users view chat images" on storage.objects for select to authenticated using (bucket_id = 'support-uploads');

create index if not exists support_conversations_owner_idx on public.support_conversations(owner_id);
create index if not exists support_messages_conversation_idx on public.support_messages(conversation_id, created_at);
create index if not exists support_push_subscriptions_admin_idx on public.support_push_subscriptions(admin_id);

-- After creating the admin in Authentication > Users, run this with their UUID:
-- insert into public.support_admins (user_id) values ('ADMIN-USER-UUID-HERE');
