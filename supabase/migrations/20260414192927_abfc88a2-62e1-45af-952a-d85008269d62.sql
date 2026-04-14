ALTER TABLE public.installed_content
ADD CONSTRAINT uq_installed_content_child_content UNIQUE (child_name, content_id);