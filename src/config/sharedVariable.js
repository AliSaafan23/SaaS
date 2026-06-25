export default {
    ...(process.env.NODE_ENV === "development"
        ? {
              address: "http://127.0.0.1:3000",
          }
        : {
              address: "https://spring.sedataxi.com",
          }),
    settingImage        : "/assets/uploads/logo/",
    usersImage          : "/assets/uploads/users/",
    productsImage       : "/assets/uploads/products/",
    customerReports     : "/assets/uploads/customer-reports/",
    supplierReports     : "/assets/uploads/supplier-reports/",
    saleInvoices        : "/assets/uploads/sale-invoices/",
    saleReturnReceipts  : "/assets/uploads/sale-return-receipts/",
    subscriptionReceipts: "/assets/uploads/subscription-receipts/",
    withdrawMethodsImage: "/assets/uploads/withdrawMethods/",
    adminImage          : "/assets/uploads/admin/",
    vehicleTypeImage    : "/assets/uploads/vehicleTypes/",
    paymentMethodImage  : "/assets/uploads/paymentMethods/",
    couponImage         : "/assets/uploads/coupons/",
    chatImage           : "/assets/uploads/chats/",
    driverImage         : "/assets/uploads/users/driver/",
};
