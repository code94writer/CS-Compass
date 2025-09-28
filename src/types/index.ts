export interface User {
  id: string;
  email: string;
  mobile: string;
  password?: string;
  is_verified: boolean;
  role: 'student' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface PDF {
  id: string;
  title: string;
  description: string;
  category_id: string;
  price: number;
  file_url: string;
  thumbnail_url?: string;
  file_size: number;
  is_active: boolean;
  uploaded_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface Purchase {
  id: string;
  user_id: string;
  pdf_id: string;
  amount: number;
  payment_id: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
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
  email: string;
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
  folders?: string[]; // Folder names or IDs
  videoUrls?: string[];
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
  contents: CourseContent;
  aboutCreator: string;
  price: number;
  discount?: number;
  offer?: Offer;
  expiry?: Date;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}
