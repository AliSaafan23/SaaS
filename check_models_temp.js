import dotenv from 'dotenv';
dotenv.config();

import { database } from './src/config/index.js';
import models from './src/models/index.js';

async function run() {
    await database.connect();
    console.log("SUCCESSFULLY INITIALIZED DATABASE");
    
    const { Company, Branch, Merchant, Cashier, CashierSubscription, CompanySubscription, SubscriptionPlan, SubscriptionPayment } = models;
    
    console.log("CashierSubscription exists:", !!CashierSubscription);
    console.log("CompanySubscription exists:", !!CompanySubscription);
    
    await database.disconnect();
    console.log("SUCCESSFULLY DISCONNECTED");
}

run().catch(console.error);
