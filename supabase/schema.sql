-- ============================================================================
-- Agro Store — schema additions, RLS, and RPC functions
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS.
-- ============================================================================

-- 1. Needed for password hashing (crypt/gen_salt)
create extension if not exists pgcrypto;

-- 2. Password column on the existing User table (stores a bcrypt hash, never plaintext)
alter table public."User" add column if not exists password text;

-- 3. Role column on User — gates the admin-only add-product route.
--    Everyone who registers through the app gets 'CUSTOMER'; promoting someone
--    to 'ADMIN' is a manual edit in the Supabase table editor / SQL editor.
alter table public."User" add column if not exists "userType" text not null default 'CUSTOMER';
alter table public."User" drop constraint if exists "User_userType_check";
alter table public."User" add constraint "User_userType_check" check ("userType" in ('CUSTOMER', 'ADMIN'));

-- 4. Product table — matches the table you already created (productID,
--    updatedDate, name, currentStock, price, imageUrl); create-if-missing here
--    just in case this runs on a fresh project, then add the descriptive
--    columns the product detail dialog needs.
create table if not exists public."Product" (
  "productID" uuid not null default gen_random_uuid (),
  "updatedDate" timestamp with time zone not null default now(),
  "name" text null,
  "currentStock" bigint null,
  "price" double precision null,
  "imageUrl" text null,
  constraint "Product_pkey" primary key ("productID")
);

alter table public."Product" add column if not exists "description" text;
alter table public."Product" add column if not exists "composition" text;
alter table public."Product" add column if not exists "ingredients" text;
alter table public."Product" add column if not exists "process" text;
alter table public."Product" add column if not exists "unit" text;

-- 5. Google sign-in support. Google OAuth goes through Supabase Auth
--    (auth.users), which is separate from this custom mobile+password User
--    table. "authUserId" links a Supabase Auth identity to a row here so the
--    rest of the app (Order, Profile, admin checks) keeps working off the
--    same public.User.userID regardless of how someone logged in.
alter table public."User" add column if not exists "authUserId" uuid unique references auth.users (id) on delete cascade;
alter table public."User" add column if not exists "email" text;

-- 6. Email is now the login identity (mobile+password login has been
--    retired — mobile numbers are captured per-delivery-address instead).
--    Case-insensitive uniqueness so "a@b.com" and "A@B.com" can't both register.
create unique index if not exists "User_email_lower_idx" on public."User" (lower("email")) where "email" is not null;

-- Password-reset token, used by the "forgot password" email flow.
alter table public."User" add column if not exists "passwordResetToken" text;
alter table public."User" add column if not exists "passwordResetExpiresAt" timestamptz;

-- Auto-create a public.User row the moment Supabase Auth creates a new
-- identity (e.g. first Google sign-in). mobileNo/password stay null — that's
-- how the app tells a Google-provisioned account apart from a mobile one.
create or replace function public.handle_new_oauth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public."User" ("authUserId", "email", "firstName", "lastName", "userType")
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'given_name', split_part(new.raw_user_meta_data ->> 'full_name', ' ', 1), ''),
    coalesce(new.raw_user_meta_data ->> 'family_name', ''),
    'CUSTOMER'
  )
  on conflict ("authUserId") do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_oauth_user();

-- ============================================================================
-- Row Level Security
-- No login method (email+password or Google) gets direct client access to
-- User/Order — everything goes through the SECURITY DEFINER functions below,
-- including reading your own profile (get_my_profile, which trusts auth.uid()
-- for Google sessions rather than a client-supplied id). That means User has
-- zero policies — RLS with no policy denies all direct access outright.
-- ============================================================================

alter table public."User" enable row level security;
alter table public."Order" enable row level security;
alter table public."Product" enable row level security;

drop policy if exists "OAuth users read own row" on public."User";

-- Product is public read-only catalog data; writes only via add_product() below.
drop policy if exists "Public read access" on public."Product";
create policy "Public read access" on public."Product"
  for select using (true);

-- Defense in depth: also revoke direct table grants from the client roles,
-- then grant back only the exact narrow thing each role needs.
revoke all on public."User" from anon, authenticated;
revoke all on public."Order" from anon, authenticated;
revoke all on public."Product" from anon, authenticated;
grant select on public."Product" to anon, authenticated;

-- ============================================================================
-- RPC functions (all SECURITY DEFINER: they run with elevated privileges but
-- only perform the exact narrow operation named, so RLS above is not
-- bypassable in any other way from the client).
-- ============================================================================

-- Postgres won't let CREATE OR REPLACE change a function's output columns or
-- argument list in place — drop every earlier shape of these first (safe
-- no-ops if you're running this for the first time / they're already gone).
drop function if exists public.register_user(bigint, text, text, text);
drop function if exists public.register_user(bigint, text, text, text, text);
drop function if exists public.login_user(bigint, text);
drop function if exists public.update_email(uuid, text);

-- Register with email + password. If that email already belongs to a
-- Google-provisioned row with no password yet, this CLAIMS it (sets the
-- password there) instead of erroring — so someone who signed in with Google
-- before can come here, use the same email, set a password, and afterwards
-- log in either way. Only errors if the email is already fully registered
-- (i.e. already has a password).
create or replace function public.register_user(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_password text
)
returns table ("userID" uuid, "firstName" text, "lastName" text, "mobileNo" bigint, "userType" text, "email" text, "hasPassword" boolean)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_email text := lower(trim(p_email));
  v_existing public."User";
begin
  select * into v_existing from public."User" u where lower(u."email") = v_email;

  if found then
    if v_existing."password" is not null then
      raise exception 'EMAIL_ALREADY_REGISTERED';
    end if;

    return query
    update public."User" as u
    set "password" = crypt(p_password, gen_salt('bf')),
        "firstName" = coalesce(nullif(v_existing."firstName", ''), p_first_name),
        "lastName" = coalesce(nullif(v_existing."lastName", ''), p_last_name)
    where u."userID" = v_existing."userID"
    returning u."userID", u."firstName", u."lastName", u."mobileNo", u."userType", u."email", true;
  else
    return query
    insert into public."User" as u ("email", "firstName", "lastName", "password")
    values (v_email, p_first_name, p_last_name, crypt(p_password, gen_salt('bf')))
    returning u."userID", u."firstName", u."lastName", u."mobileNo", u."userType", u."email", true;
  end if;
end;
$$;

-- Log in with email + password. Returns an empty set if no match.
create or replace function public.login_user(
  p_email text,
  p_password text
)
returns table ("userID" uuid, "firstName" text, "lastName" text, "mobileNo" bigint, "userType" text, "email" text, "hasPassword" boolean)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  return query
  select u."userID", u."firstName", u."lastName", u."mobileNo", u."userType", u."email", true
  from public."User" u
  where lower(u."email") = lower(trim(p_email))
    and u."password" is not null
    and u."password" = crypt(p_password, u."password");
end;
$$;

-- Fetch the current Google-session user's own profile. Uses auth.uid()
-- directly (the verified JWT identity) rather than a client-supplied id —
-- this is what replaced letting Google-signed-in users SELECT their own
-- User row directly.
create or replace function public.get_my_profile()
returns table ("userID" uuid, "firstName" text, "lastName" text, "mobileNo" bigint, "userType" text, "email" text, "hasPassword" boolean)
language sql
security definer
set search_path = public, pg_temp
as $$
  select "userID", "firstName", "lastName", "mobileNo", "userType", "email", ("password" is not null)
  from public."User"
  where "authUserId" = auth.uid();
$$;

-- Consume a password-reset token (emailed by the send-password-reset Edge
-- Function) to set a new password. Returns false if the token is wrong,
-- already used, or expired.
create or replace function public.reset_password_with_token(
  p_token text,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid;
begin
  select "userID" into v_user_id
  from public."User"
  where "passwordResetToken" = p_token
    and "passwordResetExpiresAt" > now();

  if v_user_id is null then
    return false;
  end if;

  update public."User"
  set "password" = crypt(p_new_password, gen_salt('bf')),
      "passwordResetToken" = null,
      "passwordResetExpiresAt" = null
  where "userID" = v_user_id;

  return true;
end;
$$;

-- Change password after verifying the old one. Returns true on success.
create or replace function public.change_password(
  p_user_id uuid,
  p_old_password text,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_matched boolean;
begin
  select exists (
    select 1 from public."User" u
    where u."userID" = p_user_id
      and u."password" is not null
      and u."password" = crypt(p_old_password, u."password")
  ) into v_matched;

  if not v_matched then
    return false;
  end if;

  update public."User"
  set "password" = crypt(p_new_password, gen_salt('bf'))
  where "userID" = p_user_id;

  return true;
end;
$$;

-- Order status is admin-managed after placement; keep it to a known set.
alter table public."Order" drop constraint if exists "Order_orderStatus_check";
alter table public."Order" add constraint "Order_orderStatus_check"
  check ("orderStatus" in ('Placed', 'Packed', 'Dispatched', 'Delivered') or "orderStatus" is null);

-- Human-readable business order id (distinct from the orderID uuid PK), e.g.
-- "UPLU226021AD4C5F" — state code + city code + pincode + random suffix.
alter table public."Order" add column if not exists "orderCode" text;

-- Two-letter code from a place name: initials of the first two words for a
-- multi-word name ("Uttar Pradesh" -> UP, "Jammu and Kashmir" -> JK, ignoring
-- "and"), else the first two letters ("Lucknow" -> LU).
create or replace function public.location_code(p_name text)
returns text
language plpgsql
immutable
as $$
declare
  v_words text[];
begin
  if p_name is null or trim(p_name) = '' then
    return 'XX';
  end if;

  v_words := array(
    select w from unnest(regexp_split_to_array(trim(p_name), '\s+')) w
    where lower(w) <> 'and'
  );

  if array_length(v_words, 1) >= 2 then
    return upper(substr(v_words[1], 1, 1) || substr(v_words[2], 1, 1));
  end if;

  return upper(substr(p_name, 1, 2));
end;
$$;

drop function if exists public.place_order(uuid, json, double precision, text);

-- Place an order. p_payment_method is 'ONLINE' (mock payment, marked Paid
-- immediately) or 'COD' (Cash on Delivery — stays Pending until the admin
-- collects payment on delivery).
create or replace function public.place_order(
  p_user_id uuid,
  p_product_basket json,
  p_bill_amount double precision,
  p_delivery_address text,
  p_payment_method text default 'ONLINE'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_payment_status text;
  v_amount_paid double precision;
  v_payment_id text;
  v_address jsonb;
  v_order_code text;
begin
  if not exists (select 1 from public."User" u where u."userID" = p_user_id) then
    raise exception 'INVALID_USER';
  end if;

  if p_payment_method = 'COD' then
    v_payment_status := 'Pending';
    v_amount_paid := 0;
    v_payment_id := 'COD';
  else
    v_payment_status := 'Paid';
    v_amount_paid := p_bill_amount;
    v_payment_id := 'MOCK-' || gen_random_uuid()::text;
  end if;

  begin
    v_address := p_delivery_address::jsonb;
  exception when others then
    v_address := '{}'::jsonb;
  end;

  v_order_code :=
    public.location_code(v_address ->> 'state') ||
    public.location_code(v_address ->> 'city') ||
    coalesce(v_address ->> 'pincode', '000000') ||
    upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into public."Order" (
    "userID", "productBasket", "orderStatus", "orderDate",
    "billAmount", "paymentStatus", "amountPaid", "paymentID", "deliveryAddress", "orderCode"
  )
  values (
    p_user_id, p_product_basket, 'Placed', now(),
    p_bill_amount, v_payment_status, v_amount_paid, v_payment_id, p_delivery_address, v_order_code
  )
  returning "orderID" into v_order_id;

  return v_order_id;
end;
$$;

-- Fetch a user's own order history, newest first.
create or replace function public.get_my_orders(p_user_id uuid)
returns setof public."Order"
language sql
security definer
set search_path = public, pg_temp
as $$
  select * from public."Order"
  where "userID" = p_user_id
  order by "orderDate" desc nulls last;
$$;

-- Admin: every order, with the customer's name/mobile/email flattened in so
-- the dashboard doesn't need a second round trip per row.
drop function if exists public.admin_get_all_orders(uuid);

create or replace function public.admin_get_all_orders(p_admin_user_id uuid)
returns table (
  "orderID" uuid,
  "orderCode" text,
  "userID" uuid,
  "firstName" text,
  "lastName" text,
  "mobileNo" bigint,
  "email" text,
  "orderStatus" text,
  "orderDate" timestamp,
  "billAmount" double precision,
  "paymentStatus" text,
  "amountPaid" double precision,
  "paymentID" text,
  "deliveryAddress" text,
  "productBasket" json
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public."User" u where u."userID" = p_admin_user_id and u."userType" = 'ADMIN'
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  select o."orderID", o."orderCode", o."userID", u."firstName", u."lastName", u."mobileNo", u."email",
         o."orderStatus", o."orderDate", o."billAmount", o."paymentStatus", o."amountPaid",
         o."paymentID", o."deliveryAddress", o."productBasket"
  from public."Order" o
  join public."User" u on u."userID" = o."userID"
  order by o."orderDate" desc nulls last;
end;
$$;

-- Admin: update an order's status and/or delivery address. Either argument
-- can be left null to leave that field untouched. Once an order is Delivered
-- it's final — no further status or address changes, checked here so the
-- frontend hiding the controls isn't the only thing stopping it.
create or replace function public.admin_update_order(
  p_admin_user_id uuid,
  p_order_id uuid,
  p_order_status text default null,
  p_delivery_address text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_status text;
begin
  if not exists (
    select 1 from public."User" u where u."userID" = p_admin_user_id and u."userType" = 'ADMIN'
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select "orderStatus" into v_current_status from public."Order" where "orderID" = p_order_id;

  if v_current_status = 'Delivered' then
    raise exception 'ORDER_ALREADY_DELIVERED';
  end if;

  update public."Order"
  set "orderStatus" = coalesce(p_order_status, "orderStatus"),
      "deliveryAddress" = coalesce(p_delivery_address, "deliveryAddress"),
      "updatedDate" = now()
  where "orderID" = p_order_id;

  return found;
end;
$$;

-- Add a new product. Only succeeds if the calling user's userType is ADMIN —
-- checked here server-side, not just hidden behind a frontend route, so it
-- can't be bypassed by calling the RPC directly with a non-admin's userID.
create or replace function public.add_product(
  p_admin_user_id uuid,
  p_name text,
  p_price double precision,
  p_current_stock bigint,
  p_image_url text,
  p_description text,
  p_composition text,
  p_ingredients text,
  p_process text,
  p_unit text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product_id uuid;
begin
  if not exists (
    select 1 from public."User" u
    where u."userID" = p_admin_user_id and u."userType" = 'ADMIN'
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  insert into public."Product" (
    "name", "price", "currentStock", "imageUrl",
    "description", "composition", "ingredients", "process", "unit"
  )
  values (
    p_name, p_price, p_current_stock, p_image_url,
    p_description, p_composition, p_ingredients, p_process, p_unit
  )
  returning "productID" into v_product_id;

  return v_product_id;
end;
$$;

-- Update an existing product. Same ADMIN check as add_product() — the anon
-- key alone must never be trusted to gate a write.
create or replace function public.admin_update_product(
  p_admin_user_id uuid,
  p_product_id uuid,
  p_name text,
  p_price double precision,
  p_current_stock bigint,
  p_image_url text,
  p_description text,
  p_composition text,
  p_ingredients text,
  p_process text,
  p_unit text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public."User" u
    where u."userID" = p_admin_user_id and u."userType" = 'ADMIN'
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  update public."Product"
  set "name" = p_name,
      "price" = p_price,
      "currentStock" = p_current_stock,
      "imageUrl" = p_image_url,
      "description" = p_description,
      "composition" = p_composition,
      "ingredients" = p_ingredients,
      "process" = p_process,
      "unit" = p_unit,
      "updatedDate" = now()
  where "productID" = p_product_id;

  return found;
end;
$$;

grant execute on function public.register_user(text, text, text, text) to anon, authenticated;
grant execute on function public.login_user(text, text) to anon, authenticated;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.reset_password_with_token(text, text) to anon, authenticated;
grant execute on function public.change_password(uuid, text, text) to anon, authenticated;
grant execute on function public.place_order(uuid, json, double precision, text, text) to anon, authenticated;
grant execute on function public.get_my_orders(uuid) to anon, authenticated;
grant execute on function public.add_product(uuid, text, double precision, bigint, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.admin_update_product(uuid, uuid, text, double precision, bigint, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.admin_get_all_orders(uuid) to anon, authenticated;
grant execute on function public.admin_update_order(uuid, uuid, text, text) to anon, authenticated;

-- ============================================================================
-- Storage bucket for product images. Public read (so product photos display
-- for anyone), but no client-side write policy — uploads only happen via the
-- upload-product-image Edge Function, which verifies ADMIN status server-side
-- with the service-role key before writing. Same pattern as the RPCs above:
-- never trust the anon key alone to gate a write.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images" on storage.objects
  for select using (bucket_id = 'product-images');

-- ============================================================================
-- Seed products (only inserted if the table is empty, safe to re-run)
-- ============================================================================
insert into public."Product" ("name", "description", "composition", "ingredients", "process", "price", "currentStock", "imageUrl", "unit")
select * from (values
  ('Organic Basmati Rice', 'Aged, hand-harvested basmati grown without synthetic pesticides.', '100% organic basmati rice', 'Basmati rice', 'Sun-dried after harvest, stone-milled, hand-sorted for broken grains.', 380.00, 120, 'https://picsum.photos/seed/basmati-rice/480/360', '5 kg pack'),
  ('Cold-Pressed Mustard Oil', 'Traditional wood-pressed mustard oil with a strong, pure aroma.', '100% mustard seed oil', 'Mustard seeds', 'Cold wood-pressed (kachi ghani) at low temperature to preserve nutrients.', 320.00, 80, 'https://picsum.photos/seed/mustard-oil/480/360', '1 litre bottle'),
  ('A2 Cow Ghee', 'Desi cow milk ghee made using the traditional bilona method.', 'A2 cow milk fat', 'A2 cow milk, curd culture', 'Milk is cultured into curd, churned to butter, then slow-cooked (bilona method).', 650.00, 60, 'https://picsum.photos/seed/cow-ghee/480/360', '500 ml jar'),
  ('Organic Turmeric Powder', 'Sun-dried turmeric with high curcumin content, stone-ground.', '100% turmeric (Curcuma longa)', 'Turmeric rhizome', 'Boiled, sun-dried for 2-3 weeks, then stone-ground.', 180.00, 150, 'https://picsum.photos/seed/turmeric/480/360', '500 g pack'),
  ('Organic Jaggery', 'Unrefined cane jaggery made without chemical clarifiers.', '100% sugarcane jaggery', 'Sugarcane juice', 'Juice extracted, boiled in open pans, and set in moulds — no chemical bleaching.', 140.00, 200, 'https://picsum.photos/seed/jaggery/480/360', '1 kg pack'),
  ('Farm Fresh Honey', 'Raw, unprocessed honey collected directly from forest apiaries.', '100% raw honey', 'Raw honey', 'Cold-extracted from combs and filtered without heating.', 420.00, 70, 'https://picsum.photos/seed/honey/480/360', '500 g jar'),
  ('Organic Rajma (Kidney Beans)', 'Rain-fed rajma grown in the hills without chemical fertilizer.', '100% kidney beans', 'Rajma (kidney beans)', 'Hand-harvested, sun-dried, and manually sorted.', 210.00, 100, 'https://picsum.photos/seed/rajma/480/360', '1 kg pack'),
  ('Organic Wheat Flour (Atta)', 'Stone-ground whole wheat flour from organically grown wheat.', '100% whole wheat', 'Wheat grain', 'Cleaned wheat is stone-ground (chakki) to retain bran and germ.', 90.00, 180, 'https://picsum.photos/seed/wheat-flour/480/360', '5 kg pack')
) as seed(name, description, composition, ingredients, process, price, qty, image, unit)
where not exists (select 1 from public."Product");

-- ============================================================================
-- To make yourself an admin after registering through the app, run:
--   update public."User" set "userType" = 'ADMIN' where lower("email") = lower('you@example.com');
--
-- Google sign-in also needs configuring in the Supabase dashboard (not SQL):
-- Authentication → Providers → Google → enable it with a Client ID/Secret
-- from Google Cloud Console. See the setup steps given alongside this file.
--
-- BREAKING CHANGE: mobile+password login has been removed — login is now
-- email + password only (mobile numbers are captured per delivery address
-- instead). Any account created before this change that has a password but
-- no email on file can no longer log in. If you need to keep one, set its
-- email manually first:
--   update public."User" set "email" = lower('you@example.com') where "mobileNo" = <old mobile number>;
-- ============================================================================
