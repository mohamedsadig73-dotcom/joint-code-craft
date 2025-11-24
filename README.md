# نظام إدارة الإقرارات | Declaration Management System

نظام شامل لإدارة إقرارات الدخول والخروج مع تتبع الحالات والصلاحيات المتعددة.

## 📋 المحتويات

- [نظرة عامة](#نظرة-عامة)
- [المتطلبات](#المتطلبات)
- [التثبيت والتشغيل](#التثبيت-والتشغيل)
- [المتغيرات البيئية](#المتغيرات-البيئية)
- [البنية التقنية](#البنية-التقنية)
- [الميزات](#الميزات)
- [الاختبارات](#الاختبارات)
- [النشر](#النشر)

## 🎯 نظرة عامة

نظام إدارة إقرارات متقدم يتيح:
- إنشاء وإدارة إقرارات الدخول والخروج
- نظام ترقيم تلقائي منفصل لكل نوع (IN-YYYY-XXXX / OUT-YYYY-XXXX)
- إعادة تعيين الترقيم سنوياً
- تتبع حالات الإقرارات عبر مراحل متعددة
- نظام صلاحيات متدرج (Admin, Manager, User)
- إشعارات فورية عند تغيير الحالات
- لوحات تحكم تفاعلية مع إحصائيات ورسوم بيانية
- تصدير البيانات إلى Excel و PDF

## ⚙️ المتطلبات

- **Node.js**: الإصدار 18.x أو أحدث
- **npm**: الإصدار 9.x أو أحدث (أو bun)
- **Lovable Cloud**: للخدمات الخلفية (قاعدة البيانات، المصادقة، التخزين)

## 🚀 التثبيت والتشغيل

### التطوير المحلي

```bash
# 1. استنساخ المشروع
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2. تثبيت الحزم
npm install

# 3. تشغيل الخادم المحلي
npm run dev
```

الموقع سيكون متاحاً على: `http://localhost:8080`

### الأوامر المتاحة

```bash
# تشغيل البيئة التطويرية
npm run dev

# بناء المشروع للإنتاج
npm run build

# معاينة البناء
npm run preview

# فحص الكود
npm run lint

# تنسيق الكود
npm run format

# تشغيل الاختبارات
npm run test

# تشغيل الاختبارات مع واجهة UI
npm run test:ui

# تشغيل الاختبارات مع تغطية الكود
npm run test:coverage
```

## 🔐 المتغيرات البيئية

يتم إدارة المتغيرات البيئية تلقائياً عبر Lovable Cloud. للاطلاع على المتغيرات المطلوبة، راجع ملف `.env.example`.

المتغيرات الأساسية:
- `VITE_SUPABASE_URL`: رابط قاعدة البيانات
- `VITE_SUPABASE_PUBLISHABLE_KEY`: المفتاح العام
- `VITE_SUPABASE_PROJECT_ID`: معرف المشروع

⚠️ **تنبيه**: لا تشارك المفاتيح الحقيقية في الكود المصدري!

## 🏗️ البنية التقنية

### Frontend
- **React 18** - مكتبة واجهة المستخدم
- **TypeScript** - لغة البرمجة
- **Vite** - أداة البناء السريعة
- **Tailwind CSS** - إطار التنسيق
- **shadcn/ui** - مكتبة المكونات
- **React Router** - التوجيه
- **TanStack Query** - إدارة الحالة والبيانات
- **Recharts** - الرسوم البيانية

### Backend (Lovable Cloud)
- **Supabase Database** - PostgreSQL
- **Row Level Security (RLS)** - أمان البيانات
- **Edge Functions** - الوظائف الخلفية
- **Realtime** - التحديثات الفورية
- **Storage** - تخزين الملفات

### Tools
- **ESLint** - فحص الكود
- **Prettier** - تنسيق الكود
- **Husky** - Git hooks
- **Vitest** - الاختبارات الوحدوية
- **GitHub Actions** - CI/CD

## ✨ الميزات

### نظام الترقيم المتقدم
- ترقيم منفصل لإقرارات الدخول (IN) والخروج (OUT)
- صيغة: `TYPE-YEAR-NUMBER` (مثال: `IN-2025-0001`)
- إعادة تعيين تلقائية في بداية كل سنة
- أرقام متسلسلة بأربعة خانات (0001-9999)

### إدارة الحالات
1. مسودة (Draft)
2. بانتظار توقيع المخزن
3. موقّع من المخزن
4. مُرسل إلى المكتب الإداري
5. مستلم من المكتب الإداري
6. مُعاد إلى المخزن
7. مؤرشف
8. مرفوض

### نظام الصلاحيات
- **Admin**: صلاحيات كاملة
- **Manager**: إدارة الإقرارات والمستخدمين
- **User**: إنشاء وعرض الإقرارات الخاصة

### الإشعارات
- تنبيهات فورية عند تغيير الحالات
- عداد الإشعارات غير المقروءة
- تاريخ كامل للتغييرات

## 🧪 الاختبارات

```bash
# تشغيل جميع الاختبارات
npm run test

# وضع المراقبة
npm run test:watch

# تقرير التغطية
npm run test:coverage

# واجهة Vitest UI
npm run test:ui
```

## 📦 النشر

### النشر عبر Lovable

1. افتح [Lovable Project](https://lovable.dev/projects/3af22d2e-d72f-44d9-8733-d6857e165138)
2. اضغط على **Share → Publish**
3. اضغط **Update** لنشر التحديثات

### النشر الذاتي

يمكنك نشر المشروع على أي منصة تدعم تطبيقات React:

#### Vercel
```bash
npm install -g vercel
vercel --prod
```

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

#### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "run", "preview"]
```

### متطلبات النشر

✅ تأكد من:
- إعداد جميع المتغيرات البيئية المطلوبة
- تفعيل HTTPS
- إعداد سياسات CORS صحيحة
- تفعيل النسخ الاحتياطي التلقائي لقاعدة البيانات

## 🔒 الأمان

- ✅ Row Level Security (RLS) على جميع الجداول
- ✅ تشفير المفاتيح السرية
- ✅ فحص أمني تلقائي
- ✅ التحقق من JWT في Edge Functions
- ✅ حماية من SQL Injection
- ✅ حماية من XSS

## 🤝 المساهمة

نرحب بالمساهمات! يرجى:
1. Fork المشروع
2. إنشاء فرع للميزة (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push للفرع (`git push origin feature/amazing-feature`)
5. فتح Pull Request

## 📝 الترخيص

هذا المشروع مرخص بموجب MIT License.

## 🔗 روابط مفيدة

- [Lovable Project](https://lovable.dev/projects/3af22d2e-d72f-44d9-8733-d6857e165138)
- [Lovable Documentation](https://docs.lovable.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Custom Domain Setup](https://docs.lovable.dev/features/custom-domain)

## 📞 الدعم

للحصول على المساعدة:
- راجع [التوثيق الرسمي](https://docs.lovable.dev/)
- انضم إلى [مجتمع Discord](https://discord.com/channels/1119885301872070706/1280461670979993613)
- افتح [Issue على GitHub](https://github.com/)

---

صنع بـ ❤️ باستخدام [Lovable](https://lovable.dev)
