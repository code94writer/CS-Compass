// Twilio service completely disabled for basic functionality
class TwilioService {
  private client: any = null;
  private isConfigured: boolean = false;

  constructor() {
    // Twilio service completely disabled for basic functionality
    console.warn('Twilio service disabled. SMS/OTP features will be disabled.');
    this.isConfigured = false;
  }

  async sendOTP(mobile: string, otp: string): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      console.warn(`Twilio not configured. OTP for ${mobile}: ${otp}`);
      return true; // Return true for development/testing purposes
    }

    try {
      const message = await this.client.messages.create({
        body: `Your CS Compass OTP is: ${otp}. This OTP is valid for 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: mobile,
      });

      console.log(`OTP sent to ${mobile}, Message SID: ${message.sid}`);
      return true;
    } catch (error) {
      console.error(`Failed to send OTP to ${mobile}:`, error);
      return false;
    }
  }

  async sendSMS(mobile: string, message: string): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      console.warn(`Twilio not configured. SMS for ${mobile}: ${message}`);
      return true; // Return true for development/testing purposes
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: mobile,
      });

      console.log(`SMS sent to ${mobile}, Message SID: ${result.sid}`);
      return true;
    } catch (error) {
      console.error(`Failed to send SMS to ${mobile}:`, error);
      return false;
    }
  }

  async verifyPhoneNumber(mobile: string): Promise<boolean> {
    try {
      // Basic mobile number validation
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      return phoneRegex.test(mobile);
    } catch (error) {
      console.error(`Failed to verify phone number ${mobile}:`, error);
      return false;
    }
  }
}

export default new TwilioService();
