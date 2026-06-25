import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * Firebase Admin SDK Service - Phone Auth Verification
 * =============================
 * يُستخدم هذا الـ Service للتحقق من هوية المستخدم عن طريق Firebase Phone Authentication
 *
 * كيفية العمل (Flow الكامل):
 * 1. Flutter تبعت رقم الهاتف لـ Firebase Phone Auth (verifyPhoneNumber)
 * 2. Firebase تبعت OTP SMS للمستخدم تلقائيًا
 * 3. المستخدم يدخل الكود في Flutter
 * 4. Flutter تحصل على Firebase ID Token بعد التحقق الناجح (credential.getIdToken())
 * 5. Flutter تبعت Firebase ID Token للـ Backend في body الـ request كـ "firebaseToken"
 * 6. Backend يتحقق من صحة الـ ID Token عبر Firebase Admin SDK هنا (verifyIdToken)
 * 7. إذا نجح التحقق → يُفعَّل الحساب ✅
 *
 * ملاحظة هامة:
 * - يستخدم هذا الـ Service نفس الـ Firebase instance الموجود في pushNotification.js
 * - لا يتم إنشاء app جديد لتجنب تعارض الـ initialization
 */

/**
 * Get Firebase Auth instance (reuses existing default app)
 * @returns {admin.auth.Auth} Firebase Auth instance
 */
const getAuth = () => {
    // Reuse the existing default Firebase app (initialized by pushNotification.js)
    // If no app exists yet, create one from the service account file
    if (!admin.apps.length) {
        try {
            const serviceAccount = require('../../config/firebase.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('✅ Firebase Admin SDK initialized by firebaseService');
        } catch (error) {
            console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
            throw error;
        }
    }
    return admin.auth(); // Returns auth from the default app
};

/**
 * Verify Firebase ID Token (sent from Flutter after successful phone verification)
 * @param {string} idToken - Firebase ID Token received from Flutter client
 * @returns {Promise<Object>} Result object with success, phone, uid, etc.
 */
const verifyIdToken = async (idToken) => {
    try {
        if (!idToken) {
            return {
                success: false,
                error: 'No ID token provided',
                message: 'Firebase ID token is required'
            };
        }

        const auth = getAuth();
        const decodedToken = await auth.verifyIdToken(idToken);

        console.log(`✅ Firebase token verified for UID: ${decodedToken.uid}, Phone: ${decodedToken.phone_number}`);

        return {
            success: true,
            uid: decodedToken.uid,
            phone: decodedToken.phone_number,
            message: 'Token verified successfully'
        };
    } catch (error) {
        console.error('❌ Firebase token verification failed:', error.message);

        // Handle specific Firebase Auth errors
        let errorMessage = 'Token verification failed';
        if (error.code === 'auth/id-token-expired') {
            errorMessage = 'Token has expired, please try again';
        } else if (error.code === 'auth/id-token-revoked') {
            errorMessage = 'Token has been revoked';
        } else if (error.code === 'auth/invalid-id-token') {
            errorMessage = 'Invalid token format';
        } else if (error.code === 'auth/argument-error') {
            errorMessage = 'Invalid token argument';
        }

        return {
            success: false,
            error: error.message,
            code: error.code,
            message: errorMessage
        };
    }
};

/**
 * Get user info from Firebase by UID
 * @param {string} uid - Firebase User UID
 * @returns {Promise<Object>} User info or error
 */
const getUserByUid = async (uid) => {
    try {
        const auth = getAuth();
        const userRecord = await auth.getUser(uid);
        return {
            success: true,
            uid: userRecord.uid,
            phone: userRecord.phoneNumber,
            displayName: userRecord.displayName,
            creationTime: userRecord.metadata.creationTime,
        };
    } catch (error) {
        console.error('❌ Firebase get user failed:', error.message);
        return {
            success: false,
            error: error.message,
            message: 'Failed to get user from Firebase'
        };
    }
};

export default {
    verifyIdToken,
    getUserByUid,
};

