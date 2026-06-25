import axios from "axios";

/**
 * SMS Misr Service for sending OTP and SMS to Egyptian phone numbers
 * This service integrates with SMS Misr API (https://sms.com.eg/)
 * 
 * Required Environment Variables:
 * - SMS_MASR_USERNAME: Your SMS Misr account username (from Console → Settings)
 * - SMS_MASR_PASSWORD: Your SMS Misr account password (from Console → Settings)
 * - SMS_MASR_SENDER_TOKEN: Your sender token (from Sender IDs section)
 * - SMS_MASR_OTP_TEMPLATE: Your OTP template token (optional, for OTP API)
 * - SMS_MASR_TEST_MODE: Set to 'true' for testing (environment=2), 'false' for production (environment=1)
 * 
 * API Documentation: https://sms.com.eg/
 * Balance Check: https://smsmisr.com/api/Balance/?username=xx&password=xx
 */
class SMSMasrService {
    constructor() {
        this.baseUrl = 'https://smsmisr.com/api';
        this.smsUrl = `${this.baseUrl}/SMS/`;
        this.otpUrl = `${this.baseUrl}/OTP/`;
        this.balanceUrl = `${this.baseUrl}/Balance/`;
        this.username = process.env.SMS_MASR_USERNAME;
        this.password = process.env.SMS_MASR_PASSWORD;
        this.senderToken = process.env.SMS_MASR_SENDER_TOKEN;
        this.otpTemplate = process.env.SMS_MASR_OTP_TEMPLATE;
        this.testMode = process.env.SMS_MASR_TEST_MODE === 'true';
        
        // Use test sender token if in test mode and no token provided
        if (this.testMode && !this.senderToken) {
            this.senderToken = 'b611afb996655a94c8e942a823f1421de42bf8335d24ba1f84c437b2ab11ca27'; // I think this is the test one or example it's provided on the docs
        }
    }

    /**
     * Validate if SMS Misr service is properly configured
     * @returns {boolean} True if service is configured, false otherwise
     */
    isConfigured() {
        return !!(this.username && this.password && this.senderToken);
    }
    
    /**
     * Parse SMS Misr API response codes
     * @param {string} code - Response code from API
     * @param {string} type - API type ('sms' or 'otp')
     * @returns {Object} Parsed response with success status and message
     */
    parseResponseCode(code, type = 'sms') {
        const smsResponses = {
            '1901': { success: true, message: 'SMS sent successfully' },
            '1902': { success: false, message: 'Invalid Request' },
            '1903': { success: false, message: 'Invalid username/password' },
            '1904': { success: false, message: 'Invalid sender token' },
            '1905': { success: false, message: 'Invalid mobile number' },
            '1906': { success: false, message: 'Insufficient Credit' },
            '1907': { success: false, message: 'Server updating' },
            '1908': { success: false, message: 'Invalid DelayUntil format' },
            '1909': { success: false, message: 'Invalid Message' },
            '1910': { success: false, message: 'Invalid Language' },
            '1911': { success: false, message: 'Text too long' },
            '1912': { success: false, message: 'Invalid Environment' }
        };
        
        const otpResponses = {
            '4901': { success: true, message: 'OTP sent successfully' },
            '4903': { success: false, message: 'Invalid username/password' },
            '4904': { success: false, message: 'Invalid sender token' },
            '4905': { success: false, message: 'Invalid mobile number' },
            '4906': { success: false, message: 'Insufficient Credit' },
            '4907': { success: false, message: 'Server updating' },
            '4908': { success: false, message: 'Invalid OTP' },
            '4909': { success: false, message: 'Invalid Template Token' },
            '4912': { success: false, message: 'Invalid Environment' }
        };
        
        const responses = type === 'otp' ? otpResponses : smsResponses;
        return responses[code] || { success: false, message: 'Unknown error' };
    }

    /**
     * Format Egyptian phone number for SMS Misr API
     * @param {string} phoneNumber - Phone number in any format
     * @returns {string} Formatted phone number
     */
    formatPhoneNumber(phoneNumber) {
        // Remove any non-digit characters
        let cleaned = phoneNumber.replace(/\D/g, '');
        
        // Handle different formats
        if (cleaned.startsWith('20')) {
            // Already has country code
            return cleaned;
        } else if (cleaned.startsWith('0')) {
            // Remove leading 0 and add country code
            return '20' + cleaned.substring(1);
        } else if (cleaned.length === 10) {
            // Add country code
            return '20' + cleaned;
        } else if (cleaned.length === 9) {
            // Add country code and leading 1
            return '201' + cleaned;
        }
        
        // Return as is if we can't determine format
        return cleaned;
    }

    /**
     * Send OTP SMS using SMS Misr OTP API (Recommended for verification codes)
     * Uses SMS Misr OTP API with template support for faster delivery
     * @param {string} phoneNumber - Recipient phone number
     * @param {string} otpCode - OTP code to send (max 10 characters)
     * @param {string} templateToken - Template token (optional, uses env variable if not provided)
     * @returns {Promise<Object>} API response or error object
     */
    async sendOTP(phoneNumber, otpCode, templateToken = null) {
        try {
            // Check if service is configured
            if (!this.isConfigured()) {
                console.error('SMS Misr service not configured. Please check environment variables.');
                return {
                    success: false,
                    error: 'SMS service not configured',
                    message: 'SMS service configuration missing'
                };
            }

            // Format phone number
            const formattedPhone = this.formatPhoneNumber(phoneNumber);
            
            // Check OTP length (max 10 chars according to SMS Misr docs)
            if (otpCode.length > 10) {
                return {
                    success: false,
                    error: 'OTP too long',
                    message: 'OTP code must be 10 characters or less'
                };
            }

            const template = templateToken || this.otpTemplate;
            
            // If template is provided, use OTP API, otherwise fall back to regular SMS API
            if (template) {
                // Use OTP API - Exact format from SMS Misr documentation
                const data = new URLSearchParams({
                    environment: this.testMode ? '2' : '1',
                    username: this.username,
                    password: this.password,
                    sender: this.senderToken,
                    mobile: formattedPhone,
                    template: template,
                    otp: otpCode
                });

                console.log(`📱 Sending OTP SMS to ${formattedPhone} via SMS Misr OTP API`);

                const response = await axios.post(this.otpUrl, data, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 10000
                });

                // Parse response code
                const result = this.parseResponseCode(response.data?.code, 'otp');
                
                if (result.success) {
                    console.log(`✅ OTP SMS sent successfully to ${formattedPhone} (SMSID: ${response.data?.SMSID})`);
                    return {
                        success: true,
                        messageId: response.data?.SMSID,
                        cost: response.data?.Cost,
                        message: result.message,
                        phoneNumber: formattedPhone,
                        code: response.data?.code
                    };
                } else {
                    console.error(`❌ Failed to send OTP SMS to ${formattedPhone}: ${result.message} (code: ${response.data?.code})`);
                    return {
                        success: false,
                        error: result.message,
                        message: result.message,
                        phoneNumber: formattedPhone,
                        code: response.data?.code
                    };
                }
            } else {
                // Fall back to regular SMS API if no template
                const message = `Your verification code is: ${otpCode}\nرمز التحقق الخاص بك هو: ${otpCode}`;
                return await this.sendMessage(phoneNumber, message);
            }

        } catch (error) {
            console.error(`❌ Error sending OTP SMS to ${phoneNumber}:`, error.message);
            
            // Handle specific error types
            if (error.code === 'ECONNABORTED') {
                return {
                    success: false,
                    error: 'Request timeout',
                    message: 'SMS service timeout - please try again'
                };
            } else if (error.response) {
                // API returned an error response
                const result = this.parseResponseCode(error.response.data?.code, 'otp');
                return {
                    success: false,
                    error: result.message,
                    message: result.message,
                    statusCode: error.response.status,
                    code: error.response.data?.code
                };
            } else {
                // Network or other error
                return {
                    success: false,
                    error: error.message,
                    message: 'Network error occurred'
                };
            }
        }
    }

    /**
     * Send custom SMS message using SMS Misr Bulk SMS API
     * Uses exact format from SMS Misr documentation
     * @param {string} phoneNumber - Recipient phone number (or comma-separated numbers)
     * @param {string} message - Message to send
     * @param {string} delayUntil - Optional schedule time (format: yyyyMMddHHmm)
     * @returns {Promise<Object>} API response or error object
     */
    async sendMessage(phoneNumber, code, delayUntil = null) {
        try {
            if (!this.isConfigured()) {
                return {
                    success: false,
                    error: 'SMS service not configured',
                    message: 'SMS service configuration missing'
                };
            }

            // Format phone number(s) - handle multiple numbers separated by comma
            const message = `Your verification code is: ${code}\nرمز التحقق الخاص بك هو: ${code}`;
            const phoneNumbers = phoneNumber.split(',').map(p => this.formatPhoneNumber(p.trim()));
            const formattedPhone = phoneNumbers.join(',');
            
            // Detect language: 1=English, 2=Arabic, 3=Unicode
            // Arabic regex pattern to detect Arabic characters
            const hasArabic = /[\u0600-\u06FF]/.test(message);
            const hasSpecialChars = /[^\x00-\x7F]/.test(message) && !hasArabic;
            const language = hasArabic ? '2' : hasSpecialChars ? '3' : '1';

            // Use exact format from SMS Misr documentation
            const data = new URLSearchParams({
                environment: this.testMode ? '2' : '1',
                username: this.username,
                password: this.password,
                sender: this.senderToken,
                mobile: formattedPhone,
                language: language,
                message: message
            });

            // Add optional delay parameter
            if (delayUntil) {
                data.append('DelayUntil', delayUntil);
            }

            console.log(`📱 Sending SMS to ${formattedPhone} via SMS Misr (language: ${language})`);

            const response = await axios.post(this.smsUrl, data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000
            });

            // Parse response code
            const result = this.parseResponseCode(response.data?.code, 'sms');
            
            if (result.success) {
                console.log(`✅ SMS sent successfully to ${formattedPhone} (SMSID: ${response.data?.SMSID})`);
                return {
                    success: true,
                    messageId: response.data?.SMSID,
                    cost: response.data?.Cost,
                    message: result.message,
                    phoneNumber: formattedPhone,
                    code: response.data?.code
                };
            } else {
                console.error(`❌ Failed to send SMS to ${formattedPhone}: ${result.message} (code: ${response.data?.code})`);
                return {
                    success: false,
                    error: result.message,
                    message: result.message,
                    phoneNumber: formattedPhone,
                    code: response.data?.code
                };
            }

        } catch (error) {
            console.error(`❌ Error sending SMS to ${phoneNumber}:`, error.message);
            
            if (error.code === 'ECONNABORTED') {
                return {
                    success: false,
                    error: 'Request timeout',
                    message: 'SMS service timeout - please try again'
                };
            } else if (error.response) {
                const result = this.parseResponseCode(error.response.data?.code, 'sms');
                return {
                    success: false,
                    error: result.message,
                    message: result.message,
                    statusCode: error.response.status,
                    code: error.response.data?.code
                };
            } else {
                return {
                    success: false,
                    error: error.message,
                    message: 'Network error occurred'
                };
            }
        }
    }

    /**
     * Check SMS Misr account balance
     * @returns {Promise<Object>} Balance information or error object
     */
    async checkBalance() {
        try {
            if (!this.isConfigured()) {
                return {
                    success: false,
                    error: 'SMS service not configured',
                    message: 'SMS service configuration missing'
                };
            }

            const url = `${this.balanceUrl}?username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}`;
            
            console.log('📊 Checking SMS Misr account balance...');

            const response = await axios.get(url, {
                timeout: 10000
            });

            // SMS Misr Balance API returns the balance value directly or an error object
            if (response.data) {
                // Check if response is a number (balance) or an error object
                if (typeof response.data === 'number' || typeof response.data === 'string') {
                    const balance = parseFloat(response.data);
                    console.log(`✅ Current balance: ${balance} SMS credits`);
                    return {
                        success: true,
                        balance: balance,
                        currency: 'SMS Credits',
                        message: 'Balance retrieved successfully'
                    };
                } else if (response.data.error) {
                    console.error('❌ Failed to get balance:', response.data.error);
                    return {
                        success: false,
                        error: response.data.error,
                        message: 'Failed to retrieve balance'
                    };
                } else {
                    // Unknown response format
                    return {
                        success: false,
                        error: 'Unknown response format',
                        message: 'Unexpected API response',
                        data: response.data
                    };
                }
            } else {
                return {
                    success: false,
                    error: 'Empty response',
                    message: 'No data received from API'
                };
            }

        } catch (error) {
            console.error('❌ Error checking SMS Misr balance:', error.message);
            
            if (error.code === 'ECONNABORTED') {
                return {
                    success: false,
                    error: 'Request timeout',
                    message: 'Balance check timeout'
                };
            } else if (error.response) {
                return {
                    success: false,
                    error: error.response.data?.error || 'API error',
                    message: 'Failed to retrieve balance',
                    statusCode: error.response.status
                };
            } else {
                return {
                    success: false,
                    error: error.message,
                    message: 'Network error occurred'
                };
            }
        }
    }
}

// Create singleton instance
const smsMasrService = new SMSMasrService();

// Export the service instance and class
export default smsMasrService;
export { SMSMasrService };
