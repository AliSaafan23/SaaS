# Flutter — دليل ربط النسخة الأوفلاين

مرجع لفريق Flutter لربط تطبيق POS بالباكند عند `deploymentTier: offline`.

---

## 1) نظرة عامة

| الوضع | مصدر البيانات | متى يتصل بالسيرفر |
|--------|----------------|-------------------|
| **أونلاين** | `POST /api/v1/auth/signin` ثم كل `/api/v1/*` | دائماً أثناء التشغيل |
| **أوفلاين** | **Isar** على الجهاز | تفعيل أول مرة + تجديد الترخيص فقط |

الباكند **لا** ينشئ قاعدة بيانات على الجهاز. أنتم تفتحون Isar وتخزّنون نفس حقول الـ DTO.

---

## 2) مسارات License API

Base URL: `{API_BASE}/api/v1/license`

| Method | Path | Auth | الغرض |
|--------|------|------|--------|
| `GET` | `/schema` | لا | إصدار DTOs والكيانات المدعومة |
| `POST` | `/activate` | لا | أول تفعيل (email + password + deviceId) |
| `POST` | `/refresh` | `Bearer {licenseToken}` | تجديد قبل انتهاء الاشتراك |
| `GET` | `/bootstrap` | `Bearer {licenseToken}` | لقطة كتالوج الفرع (اختياري عند التفعيل) |

### Headers المطلوبة

```
Content-Type: application/json
lang: ar | en
x-platform: desktop | mobile
```

---

## 3) تفعيل أول مرة — `POST /license/activate`

### Request

```json
{
  "email": "cashier@shop.com",
  "password": "CashierPass123",
  "deviceId": "stable-uuid-from-device",
  "deviceType": "web",
  "includeBootstrap": true
}
```

- `deviceId`: معرّف ثابت للجهاز (8–100 حرف) — **مطلوب**
- `deviceType`: `ios` | `android` | `web` (لـ desktop استخدم `web` + `x-platform: desktop`)
- `includeBootstrap`: `true` لتحميل منتجات/عملاء/موردين في نفس الرد

### Response `data` (مهم)

```json
{
  "deploymentTier": "offline",
  "selectedPlatform": "desktop",
  "license": {
    "token": "eyJhbG...",
    "expiresAt": "2027-06-23T00:00:00.000Z",
    "graceDays": 14,
    "dtoVersion": 1,
    "deviceId": "stable-uuid-from-device"
  },
  "offlineLicense": {
    "required": true,
    "expiresAt": "2027-06-23T00:00:00.000Z",
    "graceDays": 14
  },
  "store": { "enabled": false },
  "cashier": {
    "id": 5,
    "name": "محمد",
    "email": "cashier@shop.com",
    "branchId": 2,
    "branchName": "الفرع الرئيسي",
    "companyId": 1,
    "companyName": "سوبر ماركت"
  },
  "entitlements": ["inventory.view", "sales.create", "..."],
  "canUsePaidFeatures": true,
  "bootstrapIncluded": true,
  "bootstrap": {
    "dtoVersion": 1,
    "companyId": 1,
    "branchId": 2,
    "categories": [],
    "units": [],
    "products": [],
    "customers": [],
    "suppliers": []
  }
}
```

### أخطاء شائعة

| key | المعنى |
|-----|--------|
| `notOfflinePlan` | الاشتراك أونلاين — استخدم `/auth/signin` |
| `subscriptionRequired` | لا اشتراك نشط |
| `wrongPlatformSubscription` | اشتراك mobile والطلب desktop أو العكس |
| `deviceLimitReached` | تجاوز `maxDevices` في الخطة |
| `emailNotVerified` | الكاشير لم يفعّل الإيميل |

---

## 4) تجديد الترخيص — `POST /license/refresh`

```
Authorization: Bearer {licenseToken}
```

```json
{ "deviceId": "stable-uuid-from-device" }
```

يرجع `license.token` جديداً + `expiresAt` محدّث.

---

## 5) محتوى JWT الترخيص (للتحقق المحلي)

بعد فك التوقيع (نفس `JWT_SECRET` أو المفتاح العام من الباكند):

```json
{
  "type": "offline_license",
  "dtoVersion": 1,
  "graceDays": 14,
  "sub": 5,
  "cashierId": 5,
  "companyId": 1,
  "branchId": 2,
  "platform": "desktop",
  "deploymentTier": "offline",
  "entitlements": ["inventory.view", "..."],
  "licenseExpiresAt": "2027-06-23T00:00:00.000Z",
  "deviceId": "stable-uuid-from-device",
  "iat": 1710000000,
  "exp": 1710086400
}
```

### منطق التشغيل اليومي بدون نت

```
if (now <= licenseExpiresAt) → شغّل عادي
else if (now <= licenseExpiresAt + graceDays) → شغّل + banner "جدّد الترخيص"
else → اقفل الميزات المدفوعة / اطلب نت للـ refresh
```

---

## 6) Repository Pattern (مُوصى به)

```dart
abstract class ProductRepository {
  Future<List<ProductDto>> list({String? search});
  Future<ProductDto> create(ProductDto data);
}

class ApiProductRepository implements ProductRepository {
  // deploymentTier == online
  // يستدعي GET/POST /api/v1/products
}

class IsarProductRepository implements ProductRepository {
  // deploymentTier == offline
  // يقرأ/يكتب Isar فقط
}
```

### اختيار الوضع عند `main()`

```dart
Future<void> main() async {
  final stored = await secureStorage.read('offline_license');
  if (stored != null) {
    final payload = verifyLicenseLocally(stored);
    if (payload.deploymentTier == 'offline') {
      productRepo = IsarProductRepository(isar);
      return runApp(PosApp());
    }
  }
  // شاشة تفعيل أو login أونلاين
}
```

**الـ UI واحدة** — لا تفرّعوا الشاشات حسب الوضع، فرّعوا مصدر البيانات فقط.

---

## 7) Isar Collections = Backend DTOs

مرجع الحقول من الباكند:

| كيان | ملف المرجع |
|------|------------|
| Product, Category, Unit | `src/helpers/api/inventory/inventoryReturnObject.js` |
| Customer | `src/helpers/api/customers/customerReturnObject.js` |
| Supplier | `src/helpers/api/suppliers/supplierReturnObject.js` |

### حقول إضافية محلية (Flutter فقط)

```dart
DateTime updatedAtLocal;
int? serverId;  // يطابق id من السيرفر عند bootstrap
```

### مثال منتج

```dart
@collection
class LocalProduct {
  Id id = Isar.autoIncrement;
  int? serverId;
  String barcode;
  String name;
  double salePrice1;
  double quantity;
  int branchId;
  int companyId;
  DateTime updatedAtLocal;
}
```

`GET /license/schema` يرجع:

```json
{
  "dtoVersion": 1,
  "entities": ["category", "unit", "product", "customer", "supplier"],
  "deploymentModes": ["offline", "online"]
}
```

عند `dtoVersion` أعلى في تحديث التطبيق → نفّذوا `migrateLocalSchema()` في Isar.

---

## 8) Bootstrap — تعبئة Isar أول مرة

**خيار أ:** `includeBootstrap: true` في `/activate`

**خيار ب:** بعد التفعيل `GET /license/bootstrap` بـ `Bearer licenseToken`

احفظوا كل عنصر في Isar مع `serverId = item.id` من الرد.

---

## 9) الفرق عن Login الأونلاين

| | `/auth/signin` | `/license/activate` |
|--|----------------|---------------------|
| الاستخدام | POS أونلاين يومياً | أوفلاين — مرة + refresh |
| يرجع | `token` جلسة 10 أيام | `license.token` طويل العمر |
| بعدها | كل API محمي بـ JWT | **لا** تستدعوا POS APIs — Isar فقط |
| `deploymentTier` | `online` | `offline` |

لو `deploymentTier == offline` من أي مصدر، **لا** تستدعوا `/api/v1/products` إلخ في الشغل اليومي.

---

## 10) اشتراك التاجر (للاختبار)

1. التاجر يشترك من `/merchant` في خطة:
   - `POS أوفلاين — Desktop` (`deploymentTier: offline`, `platform: desktop`)
   - أو `POS أوفلاين — Mobile`
2. ينشئ كاشير: email + password
3. الكاشير يفعّل الإيميل
4. Flutter: `POST /license/activate`

---

## 11) ملفات الباكند ذات الصلة

```
src/routes/api/licenseRoute.js
src/controllers/api/licenseController.js
src/helpers/api/license/licenseService.js
src/helpers/api/license/licenseToken.js
src/helpers/api/license/licenseReturnObject.js
src/helpers/api/license/licenseBootstrap.js
src/middleware/api/verifyOfflineLicense.js
src/config/offlineLicense.js
src/models/platform/offlineLicenseActivationModel.js
src/models/platform/subscriptionPlanModel.js  → deploymentTier
```

---

## 12) متغيرات البيئة (الباكند)

```env
JWT_SECRET=...
OFFLINE_LICENSE_GRACE_DAYS=14
OFFLINE_LICENSE_PRIVATE_KEY=   # اختياري — لو فاضي يستخدم JWT_SECRET
```

---

## 13) تشغيل اختبارات الباكند

```bash
npm run db:migrate
npm run db:seed
npm run test:unit
npm run test:integration
```

---

## 14) Checklist Flutter

- [ ] شاشة تفعيل (email, password, deviceId)
- [ ] حفظ `license.token` في `flutter_secure_storage`
- [ ] فتح Isar بمجموعات DTO
- [ ] `Isar*Repository` لكل وحدة
- [ ] التحقق المحلي من `expiresAt` + `graceDays`
- [ ] شاشة/زر تجديد عند توفر نت → `/license/refresh`
- [ ] عدم استدعاء `/api/v1/*` في الوضع الأوفلاين اليومي
- [ ] احترام `entitlements[]` لإظهار/إخفاء الأقسام
