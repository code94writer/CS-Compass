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

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

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

-- Courses table (must be created before PDFs and Videos)
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    about_creator TEXT,
    price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(5,2),
    offer JSONB,
    expiry TIMESTAMP,
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PDFs table (now linked to course, not category)
CREATE TABLE IF NOT EXISTS pdfs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_size BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pdf_type VARCHAR(10) DEFAULT 'full' CHECK (pdf_type IN ('demo', 'full')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for pdfs
CREATE INDEX IF NOT EXISTS idx_pdfs_uploaded_by ON pdfs(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_pdfs_is_active ON pdfs(is_active);
CREATE INDEX IF NOT EXISTS idx_pdfs_pdf_type ON pdfs(pdf_type);

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

-- Index for videos
CREATE INDEX IF NOT EXISTS idx_videos_course_id ON videos(course_id);

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

-- Indexes for user_courses
CREATE INDEX IF NOT EXISTS idx_user_courses_user_status ON user_courses(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_courses_course_status ON user_courses(course_id, status);
CREATE INDEX IF NOT EXISTS idx_user_courses_expiry ON user_courses(expiry_date) WHERE expiry_date IS NOT NULL;

-- Payment Transactions table (PayU payment gateway integration)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Transaction identifiers
    transaction_id VARCHAR(255) UNIQUE NOT NULL, -- Our internal transaction ID
    payu_payment_id VARCHAR(255), -- PayU's payment ID (mihpayid)
    payu_txn_id VARCHAR(255), -- PayU's transaction ID

    -- User and course references
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',

    -- Payment status
    status VARCHAR(50) DEFAULT 'initiated' CHECK (status IN (
        'initiated',      -- Payment initiated, waiting for user action
        'pending',        -- Payment in progress
        'success',        -- Payment successful
        'failed',         -- Payment failed
        'cancelled',      -- Payment cancelled by user
        'refunded',       -- Payment refunded
        'timeout'         -- Payment timed out
    )),

    -- PayU specific data
    payment_mode VARCHAR(50), -- CC, DC, NB, UPI, etc.
    payment_source VARCHAR(100), -- Bank name or payment source
    card_num VARCHAR(50), -- Masked card number
    name_on_card VARCHAR(255), -- Name on card/account

    -- Security
    hash VARCHAR(512), -- Hash sent to PayU
    response_hash VARCHAR(512), -- Hash received from PayU

    -- PayU response data (stored as JSONB for flexibility)
    payu_response JSONB,

    -- Error tracking
    error_message TEXT,
    error_code VARCHAR(50),

    -- Metadata
    ip_address VARCHAR(45), -- User's IP address
    user_agent TEXT, -- User's browser/device info

    -- Idempotency
    idempotency_key VARCHAR(255) UNIQUE, -- Prevent duplicate payments

    -- Timestamps
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for payment_transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_course_id ON payment_transactions(course_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payu_payment_id ON payment_transactions(payu_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_initiated_at ON payment_transactions(initiated_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_idempotency_key ON payment_transactions(idempotency_key);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_status ON payment_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_course_status ON payment_transactions(course_id, status);

-- Trigger to update updated_at timestamp for payment_transactions
CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_transactions_updated_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_transactions_updated_at();

-- Comments for documentation
COMMENT ON TABLE payment_transactions IS 'Stores all payment transaction details for PayU payment gateway integration';
COMMENT ON COLUMN payment_transactions.transaction_id IS 'Internal unique transaction identifier';
COMMENT ON COLUMN payment_transactions.payu_payment_id IS 'PayU mihpayid returned after payment';
COMMENT ON COLUMN payment_transactions.idempotency_key IS 'Ensures duplicate payment prevention';
COMMENT ON COLUMN payment_transactions.payu_response IS 'Complete PayU response stored as JSON for audit';

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



--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_pdfs_is_active ON pdfs(is_active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pdfs_updated_at ON pdfs;
CREATE TRIGGER update_pdfs_updated_at BEFORE UPDATE ON pdfs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories (only if they don't exist)

-- Insert parent categories
INSERT INTO categories (name, description, parent_id) VALUES
    ('UPSC Mains', 'UPSC Mains', NULL),
    ('UPSC Optional', 'UPSC Optional', NULL),
    ('UPPCS', 'UPPCS', NULL),
    ('Prelims Current Affairs', 'Prelims Current Affairs', NULL),
    ('Toppers Copies', 'Toppers Copies', NULL)
ON CONFLICT (name) DO NOTHING;

-- Insert child categories (using parent names to find IDs)
INSERT INTO categories (name, description, parent_id)
SELECT 'PSIR', 'PSIR', id FROM categories WHERE name = 'UPSC Optional'
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, description, parent_id)
SELECT 'GS 2', 'GS 2', id FROM categories WHERE name = 'UPSC Mains'
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, description, parent_id)
SELECT 'Ethics', 'Ethics', id FROM categories WHERE name = 'UPSC Mains'
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, description, parent_id)
SELECT 'Anthropology', 'Anthropology', id FROM categories WHERE name = 'UPSC Optional'
ON CONFLICT (name) DO NOTHING;

-- Insert default admin user (password: admin123)
INSERT INTO users (email, mobile, password, is_verified, role) VALUES
('admin@cscompass.com', '+1234567890', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', true, 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert 2 default courses (empty - no PDFs or videos initially)
-- These courses will be created using the default admin user and default categories
INSERT INTO courses (name, description, category_id, about_creator, price, discount, created_by)
SELECT
  'Introduction to UPSC Preparation',
  'A comprehensive guide to getting started with UPSC preparation. This course covers the basics and helps you understand the exam pattern.',
  c.id,
  'CS Compass Team - Expert educators with years of experience in UPSC coaching',
  0.00,
  0.00,
  u.id
FROM categories c, users u
WHERE c.name = 'UPSC Mains' AND u.email = 'admin@cscompass.com'
ON CONFLICT DO NOTHING;

INSERT INTO courses (name, description, category_id, about_creator, price, discount, created_by)
SELECT
  'Current Affairs Essentials',
  'Stay updated with the latest current affairs essential for UPSC Prelims. This course is regularly updated with important news and analysis.',
  c.id,
  'CS Compass Team - Expert educators with years of experience in UPSC coaching',
  0.00,
  0.00,
  u.id
FROM categories c, users u
WHERE c.name = 'Prelims Current Affairs' AND u.email = 'admin@cscompass.com'
ON CONFLICT DO NOTHING;
