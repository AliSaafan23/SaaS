import i18n from 'i18n';
import { ApiResponse } from '../../utils/index.js';
import { logAudit } from '../../helpers/dashboard/auditLog.js';
import { DEFAULT_FREE_ACCESS_FEATURES, PLAN_FEATURE_PRESETS, FEATURE_GROUP_META, getPaidFeatureKeys, getFeaturesByGroup } from '../../config/subscriptionFeatures.js';
import subscriptionFeatures from '../../config/subscriptionFeatures.js';
import { SystemSetting } from '../../models/index.js';

const DEFAULT_KEYS = ['general', 'security', 'email', 'sms', 'subscription'];

export default {
    getAll: async (req, res) => {
        const settings = await SystemSetting.findAll();
        const map = {};
        settings.forEach((s) => {
            map[s.settingKey] = s.settingValue;
        });
        DEFAULT_KEYS.forEach((k) => {
            if (!map[k]) map[k] = {};
        });
        if (!map.subscription?.freeAccessFeatures) {
            map.subscription = {
                freeAccessFeatures: DEFAULT_FREE_ACCESS_FEATURES,
                lockedMessage: { ar: 'فعّل اشتراكك للوصول لهذه الميزة', en: 'Activate your subscription to access this feature' },
            };
        }
        const freeKeys = map.subscription?.freeAccessFeatures || DEFAULT_FREE_ACCESS_FEATURES;
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, {
            ...map,
            featuresCatalog: subscriptionFeatures,
            freeFeatureKeys: freeKeys,
            paidFeatureKeys: getPaidFeatureKeys(freeKeys),
            featureGroups: getFeaturesByGroup(freeKeys),
            featureGroupMeta: FEATURE_GROUP_META,
            planFeaturePresets: PLAN_FEATURE_PRESETS,
        }));
    },

    save: async (req, res) => {
        const { key, value } = req.body;
        const [row] = await SystemSetting.findOrCreate({
            where: { settingKey: key },
            defaults: { settingValue: value },
        });
        if (!row.isNewRecord) await row.update({ settingValue: value });
        await logAudit(req, { action: 'settings.updated', module: 'settings', metadata: { key } });
        res.send(new ApiResponse('success', i18n.__('settingsSaved'), 200, row));
    },
};
