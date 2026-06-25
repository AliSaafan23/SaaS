import i18n from 'i18n';
import { Op } from 'sequelize';
import { ApiResponse } from '../../utils/index.js';
import returnObject from '../../helpers/dashboard/returnobject.js';
import { errorHandler } from '../../helpers/index.js';
import { logAudit } from '../../helpers/dashboard/auditLog.js';
import {
    listActiveCountries,
    findCountryById,
    sanitizeCountryPayload,
} from '../../helpers/dashboard/countryService.js';
import { Country, Company } from '../../models/index.js';

const dashboardLang = (req) => (req.headers.lang === 'en' ? 'en' : 'ar');

const countryError = (res, key) => errorHandler(res, 'fail', key);

export default {
    /** Public list for registration dropdowns (active countries only). */
    publicList: async (req, res) => {
        const countries = await listActiveCountries();
        const lang = dashboardLang(req);
        res.send(
            new ApiResponse(
                'success',
                i18n.__('dataFetched'),
                200,
                countries.map((c) => returnObject.country(c, lang))
            )
        );
    },

    list: async (req, res) => {
        const where = {};
        if (req.query.active === '1') where.isActive = true;
        if (req.query.all !== '1') {
            // admin list shows all by default when ?all=1, otherwise active first
        }

        const countries = await Country.findAll({
            where,
            order: [
                ['sortOrder', 'ASC'],
                ['nameAr', 'ASC'],
            ],
        });

        const lang = dashboardLang(req);
        res.send(
            new ApiResponse(
                'success',
                i18n.__('dataFetched'),
                200,
                countries.map((c) => returnObject.country(c, lang))
            )
        );
    },

    getById: async (req, res) => {
        const country = await Country.findByPk(req.params.id);
        if (!country) return errorHandler(res, 'notFound', 'countryNotFound');
        res.send(
            new ApiResponse(
                'success',
                i18n.__('dataFetched'),
                200,
                returnObject.country(country, dashboardLang(req))
            )
        );
    },

    create: async (req, res) => {
        let data;
        try {
            data = sanitizeCountryPayload(req.body);
        } catch (e) {
            return countryError(res, e.message || 'validationError');
        }

        const exists = await Country.findOne({ where: { code: data.code } });
        if (exists) return countryError(res, 'countryCodeExists');

        const country = await Country.create(data);

        await logAudit(req, {
            action: 'country.created',
            module: 'countries',
            metadata: { countryId: country.id },
        });

        res.send(
            new ApiResponse(
                'success',
                i18n.__('countryCreated'),
                201,
                returnObject.country(country, dashboardLang(req))
            )
        );
    },

    update: async (req, res) => {
        const country = await Country.findByPk(req.params.id);
        if (!country) return errorHandler(res, 'notFound', 'countryNotFound');

        let updates;
        try {
            updates = sanitizeCountryPayload(req.body, { partial: true });
        } catch (e) {
            return countryError(res, e.message || 'validationError');
        }

        if (!Object.keys(updates).length) {
            return countryError(res, 'validationError');
        }

        if (updates.code && updates.code !== country.code) {
            const exists = await Country.findOne({
                where: { code: updates.code, id: { [Op.ne]: country.id } },
            });
            if (exists) return countryError(res, 'countryCodeExists');
        }

        await country.update(updates);

        await logAudit(req, {
            action: 'country.updated',
            module: 'countries',
            metadata: { countryId: country.id },
        });

        res.send(
            new ApiResponse(
                'success',
                i18n.__('countryUpdated'),
                200,
                returnObject.country(country, dashboardLang(req))
            )
        );
    },

    remove: async (req, res) => {
        const country = await Country.findByPk(req.params.id);
        if (!country) return errorHandler(res, 'notFound', 'countryNotFound');

        const companiesCount = await Company.count({ where: { countryId: country.id } });
        if (companiesCount > 0) {
            return errorHandler(res, 'fail', 'countryInUse');
        }

        await country.destroy();

        await logAudit(req, {
            action: 'country.deleted',
            module: 'countries',
            metadata: { countryId: country.id },
        });

        res.send(new ApiResponse('success', i18n.__('countryDeleted'), 200, {}));
    },
};
