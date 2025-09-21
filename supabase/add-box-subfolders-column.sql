-- Add box_subfolders column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS box_subfolders JSONB;

-- Add comment for documentation
COMMENT ON COLUMN projects.box_subfolders IS 'BOX subfolder IDs stored as JSON object {folder_name: folder_id}';