-- AjeMarket FINAL database setup
-- Run ALL of this in Supabase SQL Editor.
-- Safe browser key is NOT stored here.
create extension if not exists pgcrypto;

-- PRODUCTS: if your current table has old column names, recreate it once.
drop table if exists public.messages cascade;
drop table if exists public.favorites cascade;
drop table if exists public.reports cascade;
drop table if exists public.products cascade;
drop table if exists public.profiles cascade;

create table public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text,
 phone text,
 avatar_url text,
 verified boolean not null default false,
 is_admin boolean not null default false,
 created_at timestamptz not null default now()
);

create table public.products(
 id uuid primary key default gen_random_uuid(),
 seller_id uuid not null references public.profiles(id) on delete cascade,
 title text not null,
 category text not null,
 price numeric(14,2) not null check(price>=0),
 location text not null,
 seller_phone text,
 description text not null,
 image_url text,
 status text not null default 'active' check(status in ('active','sold','hidden')),
 created_at timestamptz not null default now()
);

create table public.favorites(
 user_id uuid not null references public.profiles(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,product_id)
);

create table public.reports(
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references public.profiles(id) on delete cascade,
 product_id uuid references public.products(id) on delete set null,
 reason text not null,
 created_at timestamptz not null default now(),
 status text not null default 'open' check(status in ('open','reviewed','closed'))
);

create table public.messages(
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.profiles(id) on delete cascade,
 receiver_id uuid not null references public.profiles(id) on delete cascade,
 product_id uuid references public.products(id) on delete set null,
 body text not null,
 created_at timestamptz not null default now(),
 read_at timestamptz
);

-- Auto-create profile for every newly registered user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 insert into public.profiles(id,full_name,phone)
 values(new.id,new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'phone')
 on conflict(id) do nothing;
 return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.favorites enable row level security;
alter table public.reports enable row level security;
alter table public.messages enable row level security;

-- Profiles
create policy "profiles_public_read" on public.profiles for select to anon,authenticated using(true);
create policy "profiles_self_update" on public.profiles for update to authenticated using(auth.uid()=id) with check(auth.uid()=id);

-- Products
create policy "products_public_read_active" on public.products for select to anon,authenticated using(status='active' or seller_id=auth.uid());
create policy "products_owner_insert" on public.products for insert to authenticated with check(seller_id=auth.uid());
create policy "products_owner_update" on public.products for update to authenticated using(seller_id=auth.uid()) with check(seller_id=auth.uid());
create policy "products_owner_delete" on public.products for delete to authenticated using(seller_id=auth.uid());

-- Favorites
create policy "favorites_self_read" on public.favorites for select to authenticated using(user_id=auth.uid());
create policy "favorites_self_insert" on public.favorites for insert to authenticated with check(user_id=auth.uid());
create policy "favorites_self_delete" on public.favorites for delete to authenticated using(user_id=auth.uid());

-- Reports: users create their own; only admins should later manage.
create policy "reports_self_insert" on public.reports for insert to authenticated with check(reporter_id=auth.uid());
create policy "reports_self_read" on public.reports for select to authenticated using(reporter_id=auth.uid());

-- Messages: participants can read; sender can insert.
create policy "messages_participant_read" on public.messages for select to authenticated using(sender_id=auth.uid() or receiver_id=auth.uid());
create policy "messages_sender_insert" on public.messages for insert to authenticated with check(sender_id=auth.uid());

-- Storage bucket for product images.
insert into storage.buckets(id,name,public) values('product-images','product-images',true)
on conflict(id) do update set public=true;

create policy "product_images_public_read" on storage.objects for select using(bucket_id='product-images');
create policy "product_images_authenticated_upload" on storage.objects for insert to authenticated with check(bucket_id='product-images');
create policy "product_images_owner_update" on storage.objects for update to authenticated using(bucket_id='product-images' and owner_id=auth.uid());
create policy "product_images_owner_delete" on storage.objects for delete to authenticated using(bucket_id='product-images' and owner_id=auth.uid());

-- Helpful indexes
create index products_created_at_idx on public.products(created_at desc);
create index products_category_idx on public.products(category);
create index products_seller_idx on public.products(seller_id);
create index messages_receiver_idx on public.messages(receiver_id,created_at desc);
create index reports_status_idx on public.reports(status,created_at desc);
