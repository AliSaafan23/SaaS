# خطة تنفيذ نظام SaaS متعدد الشركات والفروع

## الهدف
تحويل النظام من نظام كاشير واحد إلى منصة SaaS تدعم شركات متعددة، كل شركة لها فروع وكاشيرز مستقلين، مع فصل كامل بين لوحة تحكم المنصة (Super Admin) ولوحة تحكم صاحب الشركة (Merchant).

---

## 1. موديلات قاعدة البيانات الجديدة

### [NEW] `Merchant` (صاحب الشركة/التاجر)
> **الجدول**: `tbl_merchants`
> **الوصف**: حساب صاحب العمل الذي يسجل ويشترك ويدير فروعه وكاشيراته

| الحقل | النوع | الوصف |
|---|---|---|
| `id` | BIGINT (PK) | المعرف الفريد |
| `companyId` | BIGINT (FK → tbl_companies) | الشركة التابع لها |
| `name` | STRING(255) | اسم صاحب الشركة |
| `email` | STRING(255) UNIQUE | البريد الإلكتروني (لتسجيل الدخول) |
| `password` | STRING(255) | كلمة المرور (مشفرة bcrypt) |
| `phone` | STRING(30) | رقم الهاتف |
| `avatar` | STRING(255) | صورة الملف الشخصي |
| `language` | ENUM('ar','en') | اللغة المفضلة |
| `status` | ENUM('pending','active','block','delete') | حالة الحساب |
| `active` | BOOLEAN | هل تم تفعيل الإيميل؟ |
| `activationCode` | STRING(10) | كود تفعيل البريد الإلكتروني |
| `activationCodeExpiresAt` | DATE | تاريخ انتهاء كود التفعيل |
| `resetCode` | STRING(10) | كود إعادة تعيين كلمة المرور |
| `resetCodeExpiresAt` | DATE | تاريخ انتهاء كود إعادة التعيين |

---

### [NEW] `Company` (الشركة)
> **الجدول**: `tbl_companies`
> **الوصف**: الكيان الرئيسي الذي يمثل العمل التجاري ويرتبط به الاشتراك

| الحقل | النوع | الوصف |
|---|---|---|
| `id` | BIGINT (PK) | المعرف الفريد |
| `name` | STRING(255) | اسم الشركة/المحل |
| `phone` | STRING(30) | رقم هاتف الشركة |
| `address` | STRING(500) | العنوان الرئيسي |
| `logo` | STRING(255) | شعار الشركة |
| `status` | ENUM('pending','active','suspended') | حالة الشركة |

---

### [NEW] `Branch` (الفرع)
> **الجدول**: `tbl_branches`
> **الوصف**: فرع تابع لشركة معينة

| الحقل | النوع | الوصف |
|---|---|---|
| `id` | BIGINT (PK) | المعرف الفريد |
| `companyId` | BIGINT (FK → tbl_companies) | الشركة التابع لها |
| `name` | STRING(255) | اسم الفرع |
| `address` | STRING(500) | عنوان الفرع |
| `phone` | STRING(30) | رقم هاتف الفرع |
| `status` | ENUM('active','inactive') | حالة الفرع |

---

### [NEW] `CompanySubscription` (اشتراك الشركة)
> **الجدول**: `tbl_company_subscriptions`
> **الوصف**: يحل محل `CashierSubscription` — الاشتراك مرتبط بالشركة مباشرة

| الحقل | النوع | الوصف |
|---|---|---|
| `id` | BIGINT (PK) | المعرف الفريد |
| `companyId` | BIGINT (FK → tbl_companies) | الشركة |
| `subscriptionPlanId` | BIGINT (FK → tbl_subscription_plans) | الخطة المختارة |
| `platform` | ENUM('desktop','mobile') | المنصة |
| `status` | ENUM('pending','active','expired','suspended') | حالة الاشتراك |
| `startsAt` | DATE | تاريخ بداية الاشتراك |
| `expiresAt` | DATE | تاريخ انتهاء الاشتراك |
| `activatedAt` | DATE | تاريخ التفعيل |
| `notes` | STRING(500) | ملاحظات |

---

### [MODIFY] `SubscriptionPlan` (خطط الاشتراك)
> **الجدول**: `tbl_subscription_plans`
> **إضافة حقل جديد**:

| الحقل | النوع | الوصف |
|---|---|---|
| `maxBranches` | INTEGER (default: 1) | الحد الأقصى لعدد الفروع |

> الحقول الموجودة بالفعل والمفيدة:
> - `maxDevices`: الحد الأقصى لعدد الأجهزة/الكاشيرز
> - `maxProducts`: الحد الأقصى لعدد المنتجات

---

### [MODIFY] `Cashier` (الكاشير)
> **الجدول**: `tbl_cashiers`
> **إضافة حقل جديد**:

| الحقل | النوع | الوصف |
|---|---|---|
| `branchId` | BIGINT (FK → tbl_branches) | الفرع التابع له الكاشير |

> **ملاحظة**: الكاشير يبقى ليه إيميل وباسورد خاص بيه مختلف تماماً عن صاحب الشركة

---

### [MODIFY] `SubscriptionPayment` (عمليات الدفع)
> **الجدول**: `tbl_subscription_payments`
> **تعديل**: استبدال `cashierId` بـ `companyId`

| الحقل | التعديل | الوصف |
|---|---|---|
| `companyId` | إضافة (FK → tbl_companies) | الشركة الدافعة |
| `cashierId` | حذف أو إبقائه null | لم يعد مطلوباً |

---

## 2. العلاقات (Associations)

```
Company  ←──── Merchant (صاحب الشركة يملك حساب واحد أو أكثر)
Company  ←──── Branch (الشركة لها عدة فروع)
Company  ←──── CompanySubscription (الشركة لها اشتراكات)
Company  ←──── SubscriptionPayment (الشركة لها مدفوعات)
Branch   ←──── Cashier (الفرع له عدة كاشيرز)
```

---

## 3. دورة التسجيل والاشتراك لصاحب الشركة (Merchant Onboarding)

### المرحلة 1: التسجيل

**API**: `POST /api/v1/merchant/register`

**المدخلات (Body)**:
```json
{
    "name": "محمد أحمد",
    "email": "mohamed@company.com",
    "password": "SecurePass123",
    "phone": "01012345678",
    "companyName": "شركة النور للتجارة",
    "companyPhone": "0221234567",
    "companyAddress": "القاهرة - شارع التحرير"
}
```

**ما يحدث في السيرفر**:
1. التحقق من أن الإيميل غير مسجل مسبقاً
2. إنشاء سجل `Company` (حالة: `pending`)
3. إنشاء سجل `Merchant` مع ربطه بالشركة (حالة: `pending`, `active: false`)
4. إرسال كود تفعيل على البريد الإلكتروني
5. إرجاع استجابة نجاح مع رسالة "تم إرسال كود التفعيل على بريدك"

---

### المرحلة 2: تفعيل البريد الإلكتروني

**API**: `POST /api/v1/merchant/verify-email`

**المدخلات**: `{ "email": "...", "code": "123456" }`

**ما يحدث**: التحقق من الكود ← تفعيل حساب التاجر (`active: true`)

---

### المرحلة 3: تسجيل الدخول

**API**: `POST /api/v1/merchant/login`

**المدخلات**: `{ "email": "...", "password": "..." }`

**ما يحدث**:
1. التحقق من الإيميل والباسورد في جدول `tbl_merchants`
2. التحقق من أن الحساب مفعل (`active: true`)
3. إصدار توكن JWT (من نوع `merchant`)
4. إرجاع بيانات التاجر + حالة اشتراك الشركة

---

### المرحلة 4: عرض خطط الاشتراك

**API**: `GET /api/v1/merchant/plans`

**الاستجابة**: قائمة بجميع الخطط النشطة مع تفاصيلها:
```json
[
    {
        "id": 1,
        "name": "الخطة الأساسية",
        "price": 300,
        "billingCycle": "monthly",
        "maxBranches": 1,
        "maxDevices": 2,
        "maxProducts": 500,
        "features": ["sales", "inventory"]
    },
    {
        "id": 2,
        "name": "الخطة الاحترافية",
        "price": 800,
        "billingCycle": "monthly",
        "maxBranches": 5,
        "maxDevices": 10,
        "maxProducts": 5000,
        "features": ["all"]
    }
]
```

---

### المرحلة 5: الاشتراك في خطة

**API**: `POST /api/v1/merchant/subscribe`

**المدخلات**: `{ "subscriptionPlanId": 2, "platform": "desktop" }`

**ما يحدث**:
1. إنشاء `CompanySubscription` (حالة: `pending`)
2. إنشاء `SubscriptionPayment` (حالة: `pending`)
3. توجيه التاجر لبوابة الدفع (Paymob) أو انتظار تأكيد يدوي من Super Admin

---

### المرحلة 6: بعد الدفع والتفعيل

**يحدث تلقائياً بعد تأكيد الدفع**:
1. `SubscriptionPayment.status` ← `paid`
2. `CompanySubscription.status` ← `active` + حساب `startsAt` و `expiresAt`
3. `Company.status` ← `active`
4. الآن يستطيع التاجر إدارة فروعه وكاشيراته

---

## 4. إدارة الفروع والكاشيرز (Branch & Cashier Management)

### إضافة فرع جديد
**API**: `POST /api/v1/merchant/branches`

**المدخلات**: `{ "name": "فرع القاهرة", "address": "...", "phone": "..." }`

**التحقق قبل الإنشاء**:
```
عدد الفروع الحالية للشركة < maxBranches المسموح بها في الخطة
```
إذا وصل الحد ← رفض مع رسالة "لقد وصلت للحد الأقصى من الفروع، يرجى ترقية خطتك"

---

### إضافة كاشير جديد
**API**: `POST /api/v1/merchant/cashiers`

**المدخلات**:
```json
{
    "branchId": 1,
    "name": "أحمد الكاشير",
    "email": "ahmed@cashier.com",
    "password": "CashierPass123",
    "phone": "01098765432"
}
```

**التحقق قبل الإنشاء**:
```
إجمالي الكاشيرز في كل فروع الشركة < maxDevices المسموح بها في الخطة
```

**ملاحظة مهمة**: الكاشير ليه إيميل وباسورد **مختلف تماماً** عن صاحب الشركة. صاحب الشركة هو الذي يقوم بإنشاء حساب الكاشير وتحديد بياناته.

---

## 5. دورة مصادقة الكاشير (Cashier Auth — Updated)

### تسجيل دخول الكاشير (من تطبيق POS)
**API**: `POST /api/v1/auth/login` (نفس الـ endpoint الحالي)

**التعديل الجديد في المنطق**:
1. البحث عن الكاشير بالإيميل في `tbl_cashiers`
2. التحقق من الباسورد
3. **[جديد]** جلب `branchId` الخاص بالكاشير ← منه نجلب `companyId` الخاص بالفرع
4. **[جديد]** التحقق من اشتراك الشركة:
   - هل يوجد `CompanySubscription` نشط لهذه الشركة؟
   - هل `expiresAt` لم ينتهِ بعد؟
   - إذا الاشتراك منتهي ← رفض الدخول مع رسالة "اشتراك الشركة منتهي"
5. التحقق من عدد الأجهزة المتصلة (نفس المنطق الحالي `prepareCashierDeviceSession`)
6. إصدار توكن JWT (يحتوي على `cashierId` + `branchId` + `companyId`)

### ميدلوير التحقق على كل طلب API
**ملف**: `requireSubscription.js`

**التعديل الجديد**:
- بدلاً من البحث عن `CashierSubscription` ← نبحث عن `CompanySubscription`
- نجلب `companyId` من الـ JWT أو من بيانات الكاشير المحفوظة في الـ request

---

## 6. عزل البيانات لكل شركة وفرع (Data Isolation)

### [MODIFY] الجداول التالية ستحتاج حقل `companyId` و/أو `branchId`:

| الجدول | الحقل المضاف | الوصف |
|---|---|---|
| `tbl_products` | `companyId` | المنتجات تتبع الشركة (مشتركة بين فروعها) |
| `tbl_categories` | `companyId` | التصنيفات خاصة بكل شركة |
| `tbl_brands` | `companyId` | العلامات التجارية خاصة بكل شركة |
| `tbl_units` | `companyId` | وحدات القياس خاصة بكل شركة |
| `tbl_customers` | `companyId` | العملاء تابعين للشركة |
| `tbl_suppliers` | `companyId` | الموردين تابعين للشركة |
| `tbl_sales` | `branchId` | كل عملية بيع مرتبطة بفرع محدد |
| `tbl_purchases` | `branchId` | كل عملية شراء مرتبطة بفرع محدد |
| `tbl_cashbox_transactions` | `branchId` | حركات الخزنة مرتبطة بفرع |
| `tbl_expenses` | `branchId` | المصروفات مرتبطة بفرع |
| `tbl_stock_movements` | `branchId` | حركات المخزون مرتبطة بفرع |

> [!IMPORTANT]
> **المنتجات والتصنيفات والموردين والعملاء** تُربط بالـ `companyId` (مشتركة بين كل الفروع).
> **المبيعات والمشتريات والمخزون والمصروفات** تُربط بالـ `branchId` (خاصة بكل فرع).

---

## 7. ملخص الملفات المطلوب إنشاؤها/تعديلها

### ملفات جديدة (New Files):

| الملف | الوصف |
|---|---|
| `src/models/system/merchantModel.js` | موديل التاجر |
| `src/models/system/companyModel.js` | موديل الشركة |
| `src/models/system/branchModel.js` | موديل الفرع |
| `src/models/platform/companySubscriptionModel.js` | موديل اشتراك الشركة |
| `src/controllers/api/merchantAuthController.js` | تسجيل/دخول/تفعيل التاجر |
| `src/controllers/api/merchantBranchController.js` | إدارة الفروع |
| `src/controllers/api/merchantCashierController.js` | إدارة الكاشيرز |
| `src/controllers/api/merchantSubscriptionController.js` | اشتراك التاجر |
| `src/routes/api/merchantAuthRoute.js` | مسارات مصادقة التاجر |
| `src/routes/api/merchantRoute.js` | مسارات إدارة التاجر |
| `src/helpers/api/merchantAuth.js` | دوال مساعدة لمصادقة التاجر |
| `src/middleware/auth/requireMerchant.js` | ميدلوير التحقق من توكن التاجر |
| `src/database/migrations/XXXXXX-create-company-branch-merchant.cjs` | Migration لإنشاء الجداول الجديدة |
| `src/database/migrations/XXXXXX-add-branchId-companyId-to-tables.cjs` | Migration لإضافة الحقول الجديدة |

### ملفات يتم تعديلها (Modified Files):

| الملف | التعديل |
|---|---|
| `src/models/index.js` | إضافة الموديلات الجديدة والعلاقات |
| `src/models/system/cashierModel.js` | إضافة حقل `branchId` |
| `src/models/platform/subscriptionPlanModel.js` | إضافة حقل `maxBranches` |
| `src/routes/api/index.js` | إضافة مسارات التاجر |
| `src/middleware/protection/requireSubscription.js` | التحقق من `CompanySubscription` بدل `CashierSubscription` |
| `src/helpers/api/cashierAuth.js` | تعديل دورة تسجيل الدخول للتحقق من اشتراك الشركة |
| `src/helpers/dashboard/subscriptionService.js` | تعديل الدوال للعمل مع `CompanySubscription` |
| `src/helpers/api/deviceSession.js` | تعديل حساب `maxDevices` ليكون من اشتراك الشركة |
| `src/helpers/api/returnobject.js` | إضافة دوال تنسيق للـ Merchant و Branch |

---

## 8. ترتيب التنفيذ (Execution Order)

### المرحلة 1: البنية التحتية (Database & Models)
1. كتابة ملفات الـ Migration لإنشاء الجداول الجديدة
2. إنشاء الموديلات: `Company`, `Branch`, `Merchant`, `CompanySubscription`
3. تعديل الموديلات الحالية: `Cashier` (إضافة `branchId`), `SubscriptionPlan` (إضافة `maxBranches`)
4. تحديث `src/models/index.js` بالعلاقات الجديدة

### المرحلة 2: مصادقة التاجر (Merchant Auth)
1. إنشاء `merchantAuth.js` (التسجيل، تفعيل الإيميل، تسجيل الدخول، إعادة تعيين الباسورد)
2. إنشاء `requireMerchant.js` (ميدلوير التحقق من توكن التاجر)
3. إنشاء الـ Controller والـ Routes الخاصة بالتاجر

### المرحلة 3: الاشتراكات (Company Subscription)
1. إنشاء `CompanySubscription` model
2. تعديل `subscriptionService.js` للعمل مع الشركات بدل الكاشيرز
3. إنشاء Controller لعرض الخطط والاشتراك

### المرحلة 4: إدارة الفروع والكاشيرز (Branch & Cashier Management)
1. إنشاء Controllers لإدارة الفروع (CRUD مع التحقق من حدود الخطة)
2. تعديل إنشاء الكاشير ليشمل ربطه بفرع محدد

### المرحلة 5: تعديل مصادقة الكاشير (Cashier Auth Update)
1. تعديل `cashierAuth.js` للتحقق من اشتراك الشركة عند تسجيل الدخول
2. تعديل `requireSubscription.js` للتحقق من `CompanySubscription`
3. تعديل `deviceSession.js` لحساب `maxDevices` من اشتراك الشركة

### المرحلة 6: عزل البيانات (Data Isolation)
1. إضافة `companyId` و `branchId` للجداول المطلوبة
2. تعديل Controllers الحالية لفلترة البيانات حسب الشركة/الفرع

---

## 9. خطة التحقق والاختبار

### اختبارات تلقائية:
- تسجيل تاجر جديد ← تفعيل ← تسجيل دخول (يجب أن ينجح)
- اشتراك في خطة ← تأكيد الدفع ← التحقق من تفعيل الشركة
- إضافة فروع أكثر من الحد المسموح (يجب أن يُرفض)
- إضافة كاشيرز أكثر من الحد المسموح (يجب أن يُرفض)
- تسجيل دخول كاشير لشركة اشتراكها ساري (يجب أن ينجح)
- تسجيل دخول كاشير لشركة اشتراكها منتهي (يجب أن يُرفض بخطأ 402)
- كاشير فرع القاهرة لا يرى مبيعات فرع الإسكندرية (عزل البيانات)
