-- Migration: Update schema for course/pdf/video relationship and user_courses
-- 1. Add category_id to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category_id UUID;

-- 2. Add course_id to pdfs
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS course_id UUID;

-- 3. Migrate category_id from pdfs to courses (manual step may be needed for correct mapping)
-- Example: If all PDFs in a course have the same category, set that category_id on the course
-- UPDATE courses SET category_id = (SELECT category_id FROM pdfs WHERE pdfs.course_id = courses.id LIMIT 1);

-- 4. Set course_id for existing PDFs (manual step required: assign each PDF to its course)
-- Example: UPDATE pdfs SET course_id = '<course-uuid>' WHERE id = '<pdf-uuid>';

-- 5. Drop category_id from pdfs
ALTER TABLE pdfs DROP COLUMN IF EXISTS category_id;

-- 6. Create videos table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    video_url TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Remove unique constraint from user_courses
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'unique_user_course' AND table_name = 'user_courses'
    ) THEN
        ALTER TABLE user_courses DROP CONSTRAINT unique_user_course;
    END IF;
END $$;

-- 8. (Optional) Clean up or migrate any data as needed
-- Review and update data for new relationships as required.
