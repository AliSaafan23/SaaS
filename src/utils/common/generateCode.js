import crypto from 'crypto';

// [TAXI - STUB] Setting model disabled — uses random OTP until POS settings module is built
export const generateCode = async () => {
   return crypto.randomInt(100000, 999999).toString();
};

export const randomCode = (length, prefix = '') => {
   const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   const charactersLength = characters.length;

   // Generate the code
   const code = Array.from({ length }, () =>
       characters.charAt(Math.floor(Math.random() * charactersLength))
   ).join('');

   return `${prefix}${code}`; // Concatenate the prefix and code
};
