export default {
    ...(process.env.NODE_ENV === 'development'
        ? { address: 'http://127.0.0.1:3000' }
        : { address: process.env.DOMAIN || 'https://saas.example.com' }),
    adminImage: '/assets/uploads/admin/',
};
