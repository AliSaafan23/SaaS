/**
 * Public Controller
 * Handles public-facing pages like landing page, policies, and contact
 */
import { Policy } from '../../models/index.js';

export default {
    /**
     * Display landing page
     * Route: GET /
     */
    landing: async (req, res) => {
        try {
            res.render('landing/index', {
                layout: false
            });
        } catch (error) {
            console.error('Error rendering landing page:', error);
            res.status(500).send('Server Error');
        }
    },

    /**
     * Display Privacy Policy page
     * Route: GET /privacy
     */
    privacy: async (req, res) => {
        try {
            const policy = await Policy.findOne({ where: { type: 'privacy', isActive: true } });
            
            res.render('landing/policy', {
                layout: false,
                policy: policy,
                pageType: 'privacy',
                pageTitleAr: 'سياسة الخصوصية',
                pageTitleEn: 'Privacy Policy',
                pageIconClass: 'fa-shield-halved'
            });
        } catch (error) {
            console.error('Error rendering privacy page:', error);
            res.status(500).send('Server Error');
        }
    },

    /**
     * Display Terms & Conditions page
     * Route: GET /terms
     */
    terms: async (req, res) => {
        try {
            const policy = await Policy.findOne({ where: { type: 'terms', isActive: true } });
            
            res.render('landing/policy', {
                layout: false,
                policy: policy,
                pageType: 'terms',
                pageTitleAr: 'الشروط والأحكام',
                pageTitleEn: 'Terms & Conditions',
                pageIconClass: 'fa-file-contract'
            });
        } catch (error) {
            console.error('Error rendering terms page:', error);
            res.status(500).send('Server Error');
        }
    },

    /**
     * Display Contact Us / About page
     * Route: GET /contact
     */
    contact: async (req, res) => {
        try {
            const policy = await Policy.findOne({ where: { type: 'about', isActive: true } });
            
            res.render('landing/contact', {
                layout: false,
                policy: policy,
                pageTitleAr: 'تواصل معنا',
                pageTitleEn: 'Contact Us'
            });
        } catch (error) {
            console.error('Error rendering contact page:', error);
            res.status(500).send('Server Error');
        }
    }
};
