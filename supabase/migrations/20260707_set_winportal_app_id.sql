-- Align existing licenses with the WinPortal software app id.
-- Run this if licenses were generated before LICENSE_APP_ID was set in Vercel.

alter table public.licenses
alter column app_id set default 'com.winportal.windowssoftware';

update public.licenses
set app_id = 'com.winportal.windowssoftware'
where app_id is null
   or app_id = 'com.suaempresa.templateativacao';
