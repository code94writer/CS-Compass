-- CS Compass Database Schema

-- Create database (run this separately)
-- CREATE DATABASE cs_compass;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    password VARCHAR(255),
    is_verified BOOLEAN DEFAULT TRUE, -- Set to TRUE by default as email/mobile verification is disabled
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookup by email or mobile
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookup by name
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- PDFs table (now linked to course, not category)
CREATE TABLE IF NOT EXISTS pdfs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_size BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for pdfs
CREATE INDEX IF NOT EXISTS idx_pdfs_category_id ON pdfs(category_id);
CREATE INDEX IF NOT EXISTS idx_pdfs_uploaded_by ON pdfs(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_pdfs_is_active ON pdfs(is_active);

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pdf_id UUID NOT NULL REFERENCES pdfs(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_pdf UNIQUE (user_id, pdf_id)
);

CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES categories(id),
    about_creator TEXT,
    price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(5,2),
    offer JSONB,
    expiry TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Videos table (linked to course)
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

CREATE TABLE IF NOT EXISTS user_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL,
    payment_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- Removed unique constraint to allow multiple purchases per user/course
);

    -- OTPs table (for mobile OTP login/verification)
    CREATE TABLE IF NOT EXISTS otps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mobile VARCHAR(15) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for otps
    CREATE INDEX IF NOT EXISTS idx_otps_mobile ON otps(mobile);
    CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at);

-- Indexes for purchases
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_pdf_id ON purchases(pdf_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);

--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
-- CREATE INDEX IF NOT EXISTS idx_pdfs_category ON pdfs(category);
CREATE INDEX IF NOT EXISTS idx_pdfs_is_active ON pdfs(is_active);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_pdf_id ON purchases(pdf_id);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_id ON purchases(payment_id);
-- CREATE INDEX IF NOT EXISTS idx_otps_mobile ON otps(mobile);
-- CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pdfs_updated_at BEFORE UPDATE ON pdfs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories

-- Insert parent categories
INSERT INTO categories (id, name, description, parent_id) VALUES
    (1, 'UPSC Mains', 'UPSC Mains', NULL),
    (2, 'UPSC Optional', 'UPSC Optional', NULL),
    (3, 'UPPCS', 'UPPCS', NULL),
    (4, 'Prelims Current Affairs', 'Prelims Current Affairs', NULL),
    (5, 'Toppers Copies', 'Toppers Copies', NULL);

-- Insert child categories (example hierarchy)
INSERT INTO categories (id, name, description, parent_id) VALUES
    (6, 'PSIR', 'PSIR', 2),
    (7, 'GS 2', 'GS 2', 1),
    (8, 'Ethics', 'Ethics', 1),
    (9, 'Anthropology', 'Anthropology', 2);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, mobile, password, is_verified, role) VALUES 
('admin@cscompass.com', '+1234567890', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', true, 'admin')
ON CONFLICT (email) DO NOTHING;
