export interface User {
  id: string;
  email: string | null;
  mobile: string | null;
  password?: string | null;
  is_verified: boolean;
  role: 'student' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface PDF {
  id: string;
  title: string;
  description: string;
  course_id: string;
  file_url: string;
  thumbnail_url?: string;
  file_size: number;
  is_active: boolean;
  uploaded_by: string;
  pdf_type: 'demo' | 'full';
  created_at: Date;
  updated_at: Date;
}

export interface OTP {
  id: string;
  mobile: string;
  code: string;
  expires_at: Date;
  is_used: boolean;
  created_at: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string | null;
  created_at: Date;
}

export interface JWTPayload {
  userId: string;
  email: string | null;
  role: string;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface WatermarkOptions {
  mobile: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  fontSize: number;
  color: string;
}

// Course-related types
export interface CourseContent {
  pdfs?: string[]; // PDF IDs
  videos?: string[]; // Video IDs
  folders?: string[]; // Folder names or IDs
}

export interface Offer {
  title: string;
  description?: string;
  validTill?: Date;
  discountPercent?: number;
}

export interface Course {
  id?: string;
  name: string;
  description: string;
  category_id: string;
  contents?: CourseContent;
  aboutCreator: string;
  price: number;
  discount?: number;
  offer?: Offer;
  expiry?: Date;
  thumbnail_url?: string;
  is_active?: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Video {
  id: string;
  course_id: string;
  title: string;
  video_url: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// PayU Payment Gateway Types
export type PaymentStatus =
  | 'initiated'
  | 'pending'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'timeout';

export interface PayUConfig {
  merchantKey: string;
  merchantSalt: string;
  baseUrl: string; // Test or Production URL
  successUrl: string;
  failureUrl: string;
  cancelUrl: string;
}

export interface PayUPaymentRequest {
  txnid: string; // Transaction ID (unique)
  amount: string; // Amount in decimal format
  productinfo: string; // Product description
  firstname: string; // Customer first name
  email: string; // Customer email
  phone: string; // Customer phone
  surl: string; // Success URL
  furl: string; // Failure URL
  curl?: string; // Cancel URL
  udf1?: string; // User defined field 1 (can store user_id)
  udf2?: string; // User defined field 2 (can store course_id)
  udf3?: string; // User defined field 3
  udf4?: string; // User defined field 4
  udf5?: string; // User defined field 5
  hash: string; // SHA-512 hash for security
}

export interface PayUPaymentResponse {
  mihpayid: string; // PayU payment ID
  mode: string; // Payment mode (CC, DC, NB, UPI, etc.)
  status: string; // Transaction status
  unmappedstatus: string; // Unmapped status
  key: string; // Merchant key
  txnid: string; // Transaction ID
  amount: string; // Amount
  cardCategory?: string; // Card category
  discount?: string; // Discount
  net_amount_debit?: string; // Net amount debited
  addedon: string; // Timestamp
  productinfo: string; // Product info
  firstname: string; // Customer name
  lastname?: string; // Customer last name
  address1?: string; // Address
  address2?: string; // Address
  city?: string; // City
  state?: string; // State
  country?: string; // Country
  zipcode?: string; // Zipcode
  email: string; // Email
  phone: string; // Phone
  udf1?: string; // User defined field 1
  udf2?: string; // User defined field 2
  udf3?: string; // User defined field 3
  udf4?: string; // User defined field 4
  udf5?: string; // User defined field 5
  udf6?: string; // User defined field 6
  udf7?: string; // User defined field 7
  udf8?: string; // User defined field 8
  udf9?: string; // User defined field 9
  udf10?: string; // User defined field 10
  hash: string; // Response hash
  field1?: string; // Additional field
  field2?: string; // Additional field
  field3?: string; // Additional field
  field4?: string; // Additional field
  field5?: string; // Additional field
  field6?: string; // Additional field
  field7?: string; // Additional field
  field8?: string; // Additional field
  field9?: string; // Payment source
  payment_source?: string; // Payment source
  PG_TYPE?: string; // Payment gateway type
  bank_ref_num?: string; // Bank reference number
  bankcode?: string; // Bank code
  error?: string; // Error message
  error_Message?: string; // Error message
  name_on_card?: string; // Name on card
  cardnum?: string; // Masked card number
  issuing_bank?: string; // Issuing bank
  card_type?: string; // Card type
}

export interface PaymentTransaction {
  id?: string;
  transaction_id: string;
  payu_payment_id?: string;
  payu_txn_id?: string;
  user_id: string;
  course_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_mode?: string;
  payment_source?: string;
  card_num?: string;
  name_on_card?: string;
  hash?: string;
  response_hash?: string;
  payu_response?: any;
  error_message?: string;
  error_code?: string;
  ip_address?: string;
  user_agent?: string;
  idempotency_key?: string;
  initiated_at?: Date;
  completed_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface InitiatePaymentRequest {
  courseId: string;
  amount: number;
  userEmail?: string;
  userPhone?: string;
  userName?: string;
}

export interface InitiatePaymentResponse {
  transactionId: string;
  paymentUrl: string;
  paymentParams: PayUPaymentRequest;
}
