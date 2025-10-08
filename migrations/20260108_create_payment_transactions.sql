-- Migration: Create payment_transactions table for PayU integration
-- This table stores all payment transaction details for audit and verification

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_course_id ON payment_transactions(course_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payu_payment_id ON payment_transactions(payu_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_idempotency_key ON payment_transactions(idempotency_key);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_status ON payment_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_course_status ON payment_transactions(course_id, status);

-- Add trigger to update updated_at timestamp
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

-- Add comment for documentation
COMMENT ON TABLE payment_transactions IS 'Stores all payment transaction details for PayU payment gateway integration';
COMMENT ON COLUMN payment_transactions.transaction_id IS 'Internal unique transaction identifier';
COMMENT ON COLUMN payment_transactions.payu_payment_id IS 'PayU mihpayid returned after payment';
COMMENT ON COLUMN payment_transactions.idempotency_key IS 'Ensures duplicate payment prevention';
COMMENT ON COLUMN payment_transactions.payu_response IS 'Complete PayU response stored as JSON for audit';

