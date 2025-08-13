-- One-off demo avatar updates (run manually if existing rows already inserted without photo_url)
update public.profiles set photo_url='https://i.pravatar.cc/150?img=5'
 where id='1b387371-6711-485c-81f7-79b2174b90fb' and (photo_url is null or photo_url='');
update public.profiles set photo_url='https://i.pravatar.cc/150?img=12'
 where id='c38efbac-fd1e-426b-a0ab-be59fd908c8c' and (photo_url is null or photo_url='');
