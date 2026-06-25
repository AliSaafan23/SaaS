# Gold Pos — Flutter App Install Tracking

دليل تكامل فريق Flutter مع Backend لتسجيل **أول فتح للتطبيق** قبل تسجيل الدخول.

---

## 1. متى يُرسل الطلب؟

| الحدث | هل نرسل API؟ |
|--------|--------------|
| المستخدم ينزل التطبيق من Google Play / App Store | **لا** — المتجر لا يتصل بسيرفرنا |
| المستخدم **يفتح التطبيق أول مرة** | **نعم** — هنا التسجيل |
| المستخدم يفتح التطبيق مرة أخرى | اختياري — السيرفر يحدّث `lastSeen` فقط إن أُعيد الإرسال |
| المستخدم يسجّل دخول (Login) | نفس `deviceId` يُرسل مع Login لربط الجهاز بالحساب |

**الخلاصة:** استدعِ `track-install` من `main()` أو شاشة Splash **قبل** شاشة Login، **مرة واحدة** لكل تثبيت (استخدم `SharedPreferences`).

---

## 2. Endpoint

```
POST {BASE_URL}/api/v1/app/track-install
```

| البيئة | مثال BASE_URL |
|--------|----------------|
| Development | `http://10.0.2.2:3000` (Android Emulator → localhost) |
| Production | `https://api.yourdomain.com` |

### Headers

| Header | القيمة | مطلوب |
|--------|--------|--------|
| `Content-Type` | `application/json` | نعم |
| `lang` | `ar` أو `en` | لا |
| `x-platform` | `mobile` أو `desktop` | لا (يُستنتج من `deviceType`) |

**لا يوجد Authorization** — الطلب عام قبل Login.

---

## 3. Request Body

### الحقول المطلوبة

| الحقل | النوع | الوصف |
|-------|------|--------|
| `deviceId` | string | معرّف ثابت للجهاز (8–100 حرف) |
| `deviceType` | string | `android` \| `ios` \| `web` (للديسكتوب) |

### الحقول الاختيارية (مُفضّلة)

| الحقل | النوع | المصدر في Flutter |
|-------|------|-------------------|
| `countryCode` | string | `PlatformDispatcher.instance.locale.countryCode` مثل `EG`, `SA` |
| `appVersion` | string | `package_info_plus` |
| `deviceModel` | string | `device_info_plus` |
| `osVersion` | string | `device_info_plus` |
| `platform` | string | `mobile` (افتراضي) أو `desktop` |

> **لا حاجة لإرسال `countryId`** — السيرفر يحدد الدولة من `countryCode` ثم من **IP** تلقائياً.

### مصدر `deviceId` حسب المنصة

| المنصة | `deviceType` | مصدر `deviceId` |
|--------|--------------|-----------------|
| Android | `android` | `AndroidDeviceInfo.id` (ANDROID_ID) |
| iOS | `ios` | `IosDeviceInfo.identifierForVendor` |
| Desktop / Web | `web` | UUID ثابت محفوظ محلياً (`shared_preferences` / secure storage) |

---

## 4. أمثلة Request

### Android

```json
{
  "deviceId": "a1b2c3d4e5f67890",
  "deviceType": "android",
  "countryCode": "EG",
  "appVersion": "1.0.0",
  "deviceModel": "Samsung SM-A546B",
  "osVersion": "Android 14"
}
```

### iOS

```json
{
  "deviceId": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "deviceType": "ios",
  "countryCode": "SA",
  "appVersion": "1.0.0",
  "deviceModel": "iPhone15,2",
  "osVersion": "iOS 17.4"
}
```

### الحد الأدنى (يعمل)

```json
{
  "deviceId": "minimum-8-chars",
  "deviceType": "android"
}
```

---

## 5. Response

### نجاح — أول فتح (تسجيل جديد)

```json
{
  "success": true,
  "key": "success",
  "message": "تم تسجيل فتح التطبيق بنجاح",
  "code": 200,
  "data": {
    "id": 12,
    "deviceId": "a1b2c3d4e5f67890",
    "deviceType": "android",
    "platform": "mobile",
    "isNew": true,
    "isLinked": false,
    "ipAddress": "41.xxx.xxx.xxx",
    "country": {
      "id": 1,
      "name": "مصر",
      "code": "EG"
    },
    "geo": {
      "locationLabel": "Cairo — Cairo Governorate — Egypt",
      "location": {
        "country": "Egypt",
        "countryCode": "EG",
        "city": "Cairo",
        "region": "Cairo Governorate",
        "latitude": 30.05,
        "longitude": 31.24,
        "timezone": "Africa/Cairo"
      },
      "network": {
        "isp": "TE Data"
      },
      "client": {
        "os": "Android",
        "browser": "unknown",
        "deviceClass": "mobile"
      }
    },
    "appVersion": "1.0.0",
    "deviceModel": "Samsung SM-A546B",
    "osVersion": "Android 14",
    "installedAt": "2026-06-22T10:00:00.000Z",
    "lastSeenAt": "2026-06-22T10:00:00.000Z"
  }
}
```

### نجاح — نفس الجهاز مرة أخرى

- `isNew`: `false`
- لا يُعتبر تنزيلاً جديداً في لوحة الأدمن

### أخطاء شائعة

| HTTP | السبب |
|------|--------|
| 400 | `deviceId` أقل من 8 أحرف |
| 400 | `deviceType` غير صالح (ليس android/ios/web) |
| 429 | طلبات كثيرة (Rate limit) |

---

## 6. ماذا يفعل السيرفر تلقائياً؟

| البيانات | المصدر |
|----------|--------|
| IP | من الطلب |
| الدولة / المدينة / المنطقة | Geo IP (ipapi.co) |
| ISP / Timezone | Geo IP |
| `countryId` | من `countryCode` أو Geo IP |

| البيانات | المصدر |
|----------|--------|
| موديل الجهاز | **Flutter** (`deviceModel`) |
| نظام التشغيل | **Flutter** (`osVersion`) |
| نوع المنصة android/ios | **Flutter** (`deviceType`) |

> **الـ IP لا يعطي موديل الموبايل** — لذلك `deviceModel` و `osVersion` مهمان من التطبيق.

---

## 7. ربط الجهاز بعد Login

عند تسجيل دخول **الكاشير**، أرسل **نفس** `deviceId` و `deviceType` مع طلب Login:

```
POST {BASE_URL}/api/v1/auth/signin
```

```json
{
  "email": "cashier@example.com",
  "password": "********",
  "deviceId": "a1b2c3d4e5f67890",
  "deviceType": "android",
  "fcmToken": "..."
}
```

السيرفر يربط سجل `track-install` بالكاشير → الحالة في الأدمن تتغير من **زائر** إلى **كاشير**.

للتاجر (إن وُجد تطبيق تاجر):

```
POST {BASE_URL}/merchant/auth/login
```

مع `deviceId` و `deviceType` اختياريين في الـ body.

---

## 8. Packages مقترحة

```yaml
dependencies:
  device_info_plus: ^10.1.0
  package_info_plus: ^8.0.0
  shared_preferences: ^2.2.0
  http: ^1.2.0
```

---

## 9. كود Flutter مرجعي

```dart
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:device_info_plus/device_info_plus.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppInstallTracker {
  static const _trackedKey = 'goldpos_install_tracked';

  static Future<void> trackIfNeeded() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(_trackedKey) == true) return;

    final info = DeviceInfoPlugin();
    final pkg = await PackageInfo.fromPlatform();
    final locale = ui.PlatformDispatcher.instance.locale;

    late String deviceId;
    late String deviceType;
    String deviceModel = '';
    String osVersion = '';

    if (Platform.isAndroid) {
      final android = await info.androidInfo;
      deviceType = 'android';
      deviceId = android.id;
      deviceModel = '${android.manufacturer} ${android.model}';
      osVersion = 'Android ${android.version.release}';
    } else if (Platform.isIOS) {
      final ios = await info.iosInfo;
      deviceType = 'ios';
      deviceId = ios.identifierForVendor ?? '';
      deviceModel = ios.utsname.machine;
      osVersion = '${ios.systemName} ${ios.systemVersion}';
    } else {
      return;
    }

    if (deviceId.length < 8) return;

    final response = await http.post(
      Uri.parse('${AppConfig.baseUrl}/api/v1/app/track-install'),
      headers: {
        'Content-Type': 'application/json',
        'lang': 'ar',
      },
      body: jsonEncode({
        'deviceId': deviceId,
        'deviceType': deviceType,
        'countryCode': locale.countryCode,
        'appVersion': pkg.version,
        'deviceModel': deviceModel,
        'osVersion': osVersion,
      }),
    );

    if (response.statusCode == 200) {
      await prefs.setBool(_trackedKey, true);
    }
  }
}
```

### التشغيل في `main()`

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppInstallTracker.trackIfNeeded();
  runApp(const GoldPosApp());
}
```

---

## 10. تدفق العمل (Flow)

```
[تنزيل من Store]  →  لا API
        ↓
[أول فتح للتطبيق]  →  POST /api/v1/app/track-install
        ↓
[شاشة Login]       →  POST /api/v1/auth/signin (+ نفس deviceId)
        ↓
[الأدمن]           →  يرى الجهاز + الدولة + مرتبط بكاشير/تاجر
```

---

## 11. ملاحظات Testing

| السيناريو | ملاحظة |
|-----------|--------|
| Emulator على localhost | Geo IP قد لا يظهر (IP محلي) |
| جهاز حقيقي + WiFi/4G | الدولة والمدينة تظهر بشكل صحيح |
| VPN | قد تغيّر الدولة المسجّلة |
| إعادة تثبيت التطبيق | Android ID قد يتغير بعد Factory Reset |

---

## 12. Checklist لفريق Flutter

- [ ] استدعاء `track-install` في أول فتح قبل Login
- [ ] حفظ flag محلي لتجنب إرسال متكرر غير ضروري
- [ ] إرسال `deviceId` + `deviceType` دائماً
- [ ] إرسال `deviceModel` + `osVersion` + `appVersion`
- [ ] إرسال نفس `deviceId` عند Login الكاشير
- [ ] عدم الاعتماد على `countryId` — `countryCode` اختياري كافٍ
- [ ] التعامل مع فشل الشبكة بصمت (لا تمنع فتح التطبيق)

---

## 13. جهة الاتصال

لأي استفسار Backend: راجع `src/helpers/api/appInstallService.js` و `src/routes/api/appInstallRoute.js`.

**آخر تحديث:** يونيو 2026
