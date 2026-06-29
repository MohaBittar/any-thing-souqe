# AnyThing Souqe - أي شيء صوق

متجر إلكتروني متكامل مع لوحة تحكم كاملة.

## 📁 هيكل الملفات

يجب رفع **جميع** هذه الملفات والمجلدات كما هي:

```
anythingsouqe/
├── index.html              (الملف الرئيسي - المتجر)
├── setup.html              (تهيئة أولية - مرة واحدة)
├── README.md               (هذا الملف)
├── css/
│   └── style.css           (تنسيقات المتجر)
├── js/
│   ├── firebase-config.js  (اتصال Firebase)
│   └── app.js              (منطق المتجر)
└── admin/
    ├── index.html           (لوحة التحكم)
    ├── css/
    │   └── admin.css        (تنسيقات التحكم)
    └── js/
        └── admin.js         (منطق التحكم)
```

## 🚀 خطوات النشر على GitHub خطوة بخطوة

### ✅ الخطوة 1: إنشاء مستودع جديد
1. ادخل GitHub.com وسجل الدخول
2. اضغط على علامة **+** في الأعلى ثم **New repository**
3. سَمِّه `anythingsouqe` (أو أي اسم تختاره)
4. تأكد أنه **Public**
5. اضغط **Create repository**

### ✅ الخطوة 2: رفع الملفات (مهم جداً: كل الملفات مش بس index)
1. في الصفحة الجديدة، اضغط على **uploading an existing file**
2. اسحب مجلد `anythingsouqe` بالكامل إلى GitHub
3. رح تشوف كل الملفات تظهر (تأكد إنها كلها موجودة)
4. أضف commit message: `Initial commit`
5. اضغط **Commit changes**

### ✅ الخطوة 3: تفعيل GitHub Pages
1. اذهب إلى **Settings** في المستودع
2. من القائمة الجانبية اختر **Pages**
3. تحت **Branch** اختار `main` والمجلد `/ (root)`
4. اضغط **Save**

### ✅ الخطوة 4: تفعيل Firebase Authentication
1. اذهب إلى https://console.firebase.google.com
2. اختر مشروع **any-thing-souqe**
3. من القائمة الجانبية اختر **Authentication**
4. اضغط **Get started**
5. فعّل **Email/Password** ← Enable
6. فعّل **Google** ← Enable ← اختر بريدك الإلكتروني ← Save

### ✅ الخطوة 5: تفعيل Firestore Database
1. من Firebase Console، اختر **Firestore Database**
2. اضغط **Create database**
3. اختار **Start in test mode** (للأمان)
4. اختر المنطقة الأقرب لك (مثلاً `eur3`)

### ✅ الخطوة 6: تشغيل المتجر لأول مرة
1. افتح الرابط: `https://<your-username>.github.io/anythingsouqe/setup.html`
2. ستظهر صفحة تهيئة - فقط اضغط **إنشاء الحساب وتهيئة المتجر**
3. حساب المدير جاهز: MohaBittarInfo@gmail.com / AdminMohaBittarInfo12
4. بعد التهيئة، افتح `https://<your-username>.github.io/anythingsouqe/`
5. سجل الدخول بحساب المدير
6. ادخل لوحة التحكم من قائمة المستخدم

## 📱 الميزات

- **المتجر**: منتجات، أقسام، بحث، فلترة، فرز
- **سلة التسوق**: حفظ محلي، طلب مباشر، طلب واتساب
- **حساب المستخدمين**: تسجيل بالبريد/جوجل، نقاط ولاء
- **نظام النقاط**: 100 نقطة = 1 AED خصم + ربح 10 نقاط لكل 1 AED
- **لوحة التحكم**: إدارة كاملة للمنتجات، الأقسام، الطلبات، المستخدمين، النقاط، الإعدادات
- **الواتساب**: 0553260525
- **تصميم ملون** مع أنيميشن وحركات
