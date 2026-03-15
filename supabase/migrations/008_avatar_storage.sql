-- Create an 'avatars' bucket if it doesn't already exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Set up row level security policies for the avatars bucket
-- Allow anyone to read avatars (since they are public profile pictures)
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatars
create policy "Users can upload their own avatars."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' );

-- Allow users to update their own avatars
create policy "Users can update their own avatars."
  on storage.objects for update
  using ( bucket_id = 'avatars' );

-- Allow users to delete their own avatars
create policy "Users can delete their own avatars."
  on storage.objects for delete
  using ( bucket_id = 'avatars' );
