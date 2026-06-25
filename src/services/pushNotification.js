import admin from "firebase-admin";
import { Op } from "sequelize";
import { returnObject, modelMap } from "../helpers/index.js";
import i18n from "i18n";
import { sharedVariable } from "../config/index.js";
import serviceAccount from "../config/firebase.json" with { type: "json" }; 
import { Device, Admin } from '../models/index.js';
// [TAXI - COMMENTED] Setting, Personal, Driver, Notification — enable after POS model migration

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

/**
 * Handles notifications for different users and scenarios.
 */
export async function handleNotification(objUsers, body, title, key, counter, lang, data, type) {
    try {
        // Set locale to recipient's language for the duration of this send
        const previousLocale = i18n.getLocale();
        i18n.setLocale(lang || "ar");
        // [TAXI - STUB] Setting model disabled until POS settings module is built
        const Model = modelMap(objUsers.userRef?.toLowerCase());
        const objSetting = {
            image: sharedVariable.settingImage || '',
            appTitle: 'Gold Pos',
        };

        const objNotify = returnObject.objNotify(
            objUsers,
            objSetting,
            body,
            title,
            key,
            lang,
            data,
        );

        const excludedKeys = ["block", "delete", "permission", "message"];
        if (!excludedKeys.includes(key)) {
            await saveNotification(objNotify, type, Model);
        }

        // Handle user/device notifications
        if (type !== "adminNotify") {
            const user = await Model.findById(objUsers.userId, { isNotify: 1 });

            console.log("user", user)

            if (user && user.isNotify) {
                const devices = await Device.findAll({
                    where: {
                        userId: objUsers.userId,
                        deviceType: { [Op.in]: ['android', 'ios', 'web'] },
                    },
                });
                console.log("USER FOUND AND ALLOWS NOTIFICATIONS", devices)
                await Promise.all(
                    devices.map((device) => {
                        const objSendNotify = returnObject.objSendNotify(
                            device.fcmToken,
                            objSetting,
                            body,
                            title,
                            key,
                            counter,
                            lang,
                            data
                        );
                        console.log("objSendNotify", objSendNotify)
                        return sendNotification(objSendNotify, device.deviceType);
                    })
                );
            }
        }

        // Handle admin notifications
        if (type === "adminNotify") {
            const devices = await Device.findAll({
                where: { userId: objUsers.userId, deviceType: 'web' },
            });

            console.log("devices", devices)

            devices.forEach((device) => {
                const objSendNotify = returnObject.objSendNotify(
                    device.deviceId,
                    objSetting,
                    body,
                    title,
                    key,
                    counter,
                    lang,
                    data
                );
                sendNotification(objSendNotify, "web");
            });
        }

        // Handle block key: delete user devices
        if (key === "block") {
            await Device.destroy({ where: { userId: objUsers.userId } });
        }
    } catch (error) {
        console.error("Error handling notification:", error);
    } finally {
        // Restore previous locale to avoid side effects
        try { i18n.setLocale(previousLocale); } catch (_) {}
    }
}

/**
 * Saves the notification to the database.
 */
export async function saveNotification(objNotify, type, Model) {
    try {
        // [TAXI - STUB] Notification model disabled until POS migration
        // const notification = await Notification.create(objNotify);
        const notification = objNotify;
        if (type === 'adminNotify') {
            await Admin.increment('notifyCount', { where: { id: notification.userId } });
        } else if (Model) {
            await Model.increment('notifyCount', { where: { id: notification.userId } });
        }
    } catch (error) {
        console.error("Error saving notification:", error);
    }
}

/**
 * Sends a notification using Firebase Admin.
 */
export async function sendNotification(objSendNotify, deviceType) {
    try {
        console.log("objSendNotify", objSendNotify)
        const message = {
            token : objSendNotify.token, // For a single device
            notification: {
                title : objSendNotify.notification.title,
                body  : objSendNotify.notification.body
            },
            data: objSendNotify.data, // Custom data for all platforms
        };

        // Add platform-specific options
        if (deviceType === "ios") {
            message.apns = {
                payload: {
                    aps: {
                        sound: "default",
                        badge: Number(objSendNotify.data.badge) // Badge for iOS notifyCount of user
                    },
                },
            };

            // also work
            // message.apns = {
            //     headers: {
            //         "apns-priority": "10" // high priority
            //     },
            //     payload: {
            //         aps: {
            //             alert: {
            //                 title: objSendNotify.notification.title,
            //                 body: objSendNotify.notification.body
            //             },
            //             sound: "default",
            //             badge: Number(objSendNotify.data?.badge || 0)
            //         }
            //     }
            // };
        } else if (deviceType === "android") {
            message.android = {
                notification: {
                    sound: "default",
                    channelId: "default_channel", // Ensure the app has a default notification channel
                },
                data: {
                    badge: objSendNotify.data.badge, // Add badge as part of custom data (notifyCount of user)
                },
            };
        } else if (deviceType === "web") {
            message.webpush = {
                headers: {
                    Urgency: "high",
                },
                notification: {
                    icon: "fcm_push_icon",
                    click_action: sharedVariable.address + objSendNotify.data.url,
                },
            };
        }

        console.log("message", message);
        const response = await admin.messaging().send(message);
        console.log("Notification sent successfully:", response);
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}

// Default export for backward compatibility
export default {
    handleNotification,
    saveNotification,
    sendNotification
};