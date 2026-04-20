-- Pocket Brain auth + user isolation v1
-- 目标：
-- 1. items / folders / tags 开始绑定真实 user_id
-- 2. RLS 按 auth.uid() 做数据隔离
-- 3. item_tags / item_tag_suppressions 只允许操作自己 item 下的关系
-- 4. attachments bucket 按用户目录隔离
--
-- 执行方式：
-- 1. 先在 Supabase SQL Editor 执行本脚本
-- 2. 再让现有用户注册登录
-- 3. 最后按文末 SQL 做一次旧假 ID 数据迁移

begin;

create extension if not exists pgcrypto;

alter table if exists public.items
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table if exists public.folders
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table if exists public.tags
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table if exists public.items
  alter column user_id set default auth.uid();

alter table if exists public.folders
  alter column user_id set default auth.uid();

alter table if exists public.tags
  alter column user_id set default auth.uid();

create index if not exists idx_items_user_id on public.items(user_id);
create index if not exists idx_folders_user_id on public.folders(user_id);
create index if not exists idx_tags_user_id on public.tags(user_id);

create unique index if not exists uniq_tags_user_name_type
  on public.tags(user_id, lower(name), type)
  where user_id is not null;

alter table if exists public.items enable row level security;
alter table if exists public.folders enable row level security;
alter table if exists public.tags enable row level security;
alter table if exists public.item_tags enable row level security;
alter table if exists public.item_tag_suppressions enable row level security;

drop policy if exists "items_select_own" on public.items;
create policy "items_select_own"
  on public.items
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "items_insert_own" on public.items;
create policy "items_insert_own"
  on public.items
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "items_update_own" on public.items;
create policy "items_update_own"
  on public.items
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "items_delete_own" on public.items;
create policy "items_delete_own"
  on public.items
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "folders_select_own" on public.folders;
create policy "folders_select_own"
  on public.folders
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "folders_insert_own" on public.folders;
create policy "folders_insert_own"
  on public.folders
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "folders_update_own" on public.folders;
create policy "folders_update_own"
  on public.folders
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "folders_delete_own" on public.folders;
create policy "folders_delete_own"
  on public.folders
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "tags_select_own" on public.tags;
create policy "tags_select_own"
  on public.tags
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "tags_insert_own" on public.tags;
create policy "tags_insert_own"
  on public.tags
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "tags_update_own" on public.tags;
create policy "tags_update_own"
  on public.tags
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "tags_delete_own" on public.tags;
create policy "tags_delete_own"
  on public.tags
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "item_tags_select_own" on public.item_tags;
create policy "item_tags_select_own"
  on public.item_tags
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.items i
      where i.id = item_tags.item_id
        and i.user_id = auth.uid()
    )
  );

drop policy if exists "item_tags_insert_own" on public.item_tags;
create policy "item_tags_insert_own"
  on public.item_tags
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.items i
      where i.id = item_tags.item_id
        and i.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.tags t
      where t.id = item_tags.tag_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists "item_tags_delete_own" on public.item_tags;
create policy "item_tags_delete_own"
  on public.item_tags
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.items i
      where i.id = item_tags.item_id
        and i.user_id = auth.uid()
    )
  );

drop policy if exists "item_tag_suppressions_select_own" on public.item_tag_suppressions;
create policy "item_tag_suppressions_select_own"
  on public.item_tag_suppressions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.items i
      where i.id = item_tag_suppressions.item_id
        and i.user_id = auth.uid()
    )
  );

drop policy if exists "item_tag_suppressions_insert_own" on public.item_tag_suppressions;
create policy "item_tag_suppressions_insert_own"
  on public.item_tag_suppressions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.items i
      where i.id = item_tag_suppressions.item_id
        and i.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.tags t
      where t.id = item_tag_suppressions.tag_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists "item_tag_suppressions_delete_own" on public.item_tag_suppressions;
create policy "item_tag_suppressions_delete_own"
  on public.item_tag_suppressions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.items i
      where i.id = item_tag_suppressions.item_id
        and i.user_id = auth.uid()
    )
  );

-- categories 保持公开可读，分类器和前端都需要读取。
alter table if exists public.categories enable row level security;
drop policy if exists "categories_read_all" on public.categories;
create policy "categories_read_all"
  on public.categories
  for select
  to authenticated, anon
  using (true);

-- storage：要求对象路径以 auth.uid() 开头，例如 "{uid}/{uuid}.png"
drop policy if exists "attachments_insert_own" on storage.objects;
create policy "attachments_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "attachments_select_own" on storage.objects;
create policy "attachments_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "attachments_delete_own" on storage.objects;
create policy "attachments_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'attachments'
    and split_part(name, '/', 1) = auth.uid()::text
  );

commit;

-- 旧数据一次性手动迁移示例（把 fake user_id 数据绑到真实 uid）
-- 运行前请先把 {REAL_UID} 替换成真实用户 uid
--
-- update public.items   set user_id = '{REAL_UID}' where user_id is null;
-- update public.folders set user_id = '{REAL_UID}' where user_id is null;
-- update public.tags    set user_id = '{REAL_UID}' where user_id is null;
