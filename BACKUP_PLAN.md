# خطة النسخ الاحتياطي لقاعدة البيانات
# Database Backup Plan

## 📋 نظرة عامة

هذا المستند يحدد خطة النسخ الاحتياطي الشاملة لقاعدة البيانات في نظام إدارة الإقرارات.

## 🎯 أهداف النسخ الاحتياطي

1. **حماية البيانات**: ضمان عدم فقدان البيانات في حالة الأعطال
2. **الاستعادة السريعة**: القدرة على استعادة النظام بسرعة
3. **الامتثال**: الالتزام بمعايير حفظ البيانات
4. **استمرارية العمل**: ضمان استمرار الخدمة

## 📊 البيانات المشمولة

### الجداول الحرجة (Critical)
- `declarations` - الإقرارات (360+ سجل)
- `declaration_status_history` - تاريخ التغييرات (736+ سجل)
- `profiles` - معلومات المستخدمين
- `user_roles` - صلاحيات المستخدمين
- `notifications` - الإشعارات

### البيانات الوصفية (Metadata)
- Database schemas
- RLS policies
- Functions & triggers
- Indexes

## ⏰ جدول النسخ الاحتياطي

### 1. النسخ الاحتياطي اليومي (Daily Backups)
- **التوقيت**: 2:00 صباحاً بتوقيت السيرفر
- **الاحتفاظ**: 7 أيام
- **النوع**: Full backup
- **الأولوية**: عالية

### 2. النسخ الاحتياطي الأسبوعي (Weekly Backups)
- **التوقيت**: كل أحد 3:00 صباحاً
- **الاحتفاظ**: 4 أسابيع
- **النوع**: Full backup
- **الأولوية**: متوسطة

### 3. النسخ الاحتياطي الشهري (Monthly Backups)
- **التوقيت**: أول يوم من كل شهر 4:00 صباحاً
- **الاحتفاظ**: 12 شهراً
- **النوع**: Full backup + Archive
- **الأولوية**: عالية

### 4. النسخ الاحتياطي قبل التحديثات (Pre-deployment)
- **التوقيت**: قبل كل تحديث كبير
- **الاحتفاظ**: حتى نجاح التحديث + 7 أيام
- **النوع**: Full backup + Snapshot
- **الأولوية**: حرجة

## 🔧 طرق النسخ الاحتياطي

### A. Lovable Cloud (Supabase) Automatic Backups

#### التفعيل
```bash
# يتم تفعيل النسخ الاحتياطي التلقائي من لوحة التحكم
# Project Settings → Database → Backups
# Enable: Daily backups with 7-day retention
```

#### المميزات
- ✅ نسخ تلقائي يومي
- ✅ Point-in-time recovery (PITR)
- ✅ استعادة سريعة
- ✅ لا يحتاج إعداد برمجي

### B. Manual Backup Script

#### سكريبت النسخ اليدوي
```bash
#!/bin/bash
# backup.sh - Manual database backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
PROJECT_ID="YOUR_PROJECT_ID"

# Create backup directory
mkdir -p $BACKUP_DIR

# Export database using pg_dump
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  -F c \
  -f "$BACKUP_DIR/backup_$DATE.dump"

# Compress backup
gzip "$BACKUP_DIR/backup_$DATE.dump"

# Upload to cloud storage (optional)
# aws s3 cp "$BACKUP_DIR/backup_$DATE.dump.gz" s3://your-bucket/

echo "Backup completed: backup_$DATE.dump.gz"
```

### C. Edge Function للنسخ الاحتياطي البرمجي

```typescript
// supabase/functions/backup-database/index.ts
// يمكن جدولته باستخدام pg_cron

import { createClient } from "@supabase/supabase-js";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Export critical tables
  const tables = [
    "declarations",
    "declaration_status_history",
    "profiles",
    "user_roles",
    "notifications"
  ];

  const backupData: Record<string, any> = {};

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*");
    if (!error) {
      backupData[table] = data;
    }
  }

  // Store in Supabase Storage
  const timestamp = new Date().toISOString();
  const fileName = `backup_${timestamp}.json`;

  await supabase.storage
    .from("backups")
    .upload(fileName, JSON.stringify(backupData));

  return new Response(JSON.stringify({ success: true, fileName }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

## 📍 مواقع التخزين

### 1. Primary Storage (الأساسي)
- **الموقع**: Lovable Cloud (Supabase)
- **النوع**: Automated backups
- **الوصول**: لوحة التحكم

### 2. Secondary Storage (الثانوي)
- **الموقع**: AWS S3 / Google Cloud Storage
- **النوع**: Compressed archives
- **الوصول**: API / CLI

### 3. Offline Storage (دون اتصال)
- **الموقع**: خادم محلي أو قرص خارجي
- **النوع**: Monthly archives
- **الوصول**: مادي

## 🔄 إجراءات الاستعادة (Recovery Procedures)

### 1. استعادة كاملة (Full Recovery)

#### من Lovable Cloud Backups
```bash
# 1. افتح لوحة التحكم
# 2. اذهب إلى Database → Backups
# 3. اختر النسخة المطلوبة
# 4. اضغط Restore
# 5. تأكيد الاستعادة
```

#### من النسخ اليدوية
```bash
# Restore from backup file
PGPASSWORD=$DB_PASSWORD pg_restore \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  -c \
  backup_YYYYMMDD_HHMMSS.dump
```

### 2. استعادة جزئية (Partial Recovery)

```sql
-- استعادة جدول محدد
COPY declarations FROM '/path/to/declarations_backup.csv' 
WITH (FORMAT csv, HEADER true);
```

### 3. Point-in-Time Recovery (PITR)

```bash
# استعادة إلى وقت محدد (Supabase Pro plan)
# Project Settings → Database → Point-in-time recovery
# Select date and time → Restore
```

## 🧪 اختبار الاستعادة (Recovery Testing)

### جدول الاختبار
- **شهرياً**: اختبار استعادة كاملة على بيئة اختبار
- **ربع سنوياً**: محاكاة كارثة كاملة واستعادة
- **سنوياً**: مراجعة وتحديث الخطة

### قائمة التحقق (Checklist)
```
□ تحميل آخر نسخة احتياطية
□ استعادة على بيئة اختبار
□ التحقق من سلامة البيانات
□ اختبار العلاقات (Foreign Keys)
□ التحقق من RLS policies
□ اختبار الوظائف (Functions)
□ توثيق النتائج والمدة الزمنية
```

## 📊 المراقبة والتنبيهات (Monitoring & Alerts)

### التنبيهات المطلوبة
1. **فشل النسخ الاحتياطي**
   - إرسال بريد إلكتروني فوراً
   - إشعار Slack/Discord
   - تسجيل في نظام المراقبة

2. **مساحة التخزين منخفضة**
   - تنبيه عند 80% استخدام
   - تنبيه حرج عند 90%

3. **نسخة احتياطية قديمة**
   - تنبيه إذا مر أكثر من 25 ساعة

### Dashboard للمراقبة
```typescript
// مثال على endpoint للمراقبة
GET /api/backup-status
{
  "last_backup": "2025-01-20T02:00:00Z",
  "status": "success",
  "size": "450MB",
  "next_backup": "2025-01-21T02:00:00Z",
  "storage_used": "12.4GB",
  "storage_limit": "25GB"
}
```

## 🔐 الأمان والتشفير

### متطلبات الأمان
1. ✅ تشفير النسخ الاحتياطية (AES-256)
2. ✅ تشفير النقل (TLS 1.3)
3. ✅ تحكم صارم في الوصول
4. ✅ مراجعة الوصول (Audit logs)
5. ✅ اختبارات أمان دورية

### التحكم في الوصول
```yaml
Backup Access Levels:
  - View Only: Manager
  - Create Backup: Manager, Admin
  - Restore: Admin only
  - Delete: Admin only (with approval)
```

## 💰 التكاليف المتوقعة

### Lovable Cloud (Supabase)
- **Free Plan**: 7 يوم احتفاظ تلقائي
- **Pro Plan**: 30 يوم + PITR
- **Enterprise**: حسب الاتفاق

### التخزين الخارجي (AWS S3)
- **التخزين**: ~$0.023/GB/شهر
- **النقل**: ~$0.09/GB
- **التقدير**: ~$5-15/شهر لـ 200GB

## 📝 المسؤوليات

| الدور | المسؤولية |
|------|-----------|
| **Admin** | تفعيل وإدارة النسخ التلقائي |
| **DevOps** | مراقبة السكريبتات والتنبيهات |
| **Manager** | مراجعة سجلات النسخ الاحتياطي |
| **Developer** | اختبار الاستعادة في بيئة التطوير |

## 📞 جهات الاتصال للطوارئ

```yaml
Primary Contact:
  Name: [اسم مدير النظام]
  Phone: [+966XXXXXXXXX]
  Email: [admin@example.com]

Backup Contact:
  Name: [اسم مدير فني]
  Phone: [+966XXXXXXXXX]
  Email: [tech@example.com]

Vendor Support:
  Lovable: https://docs.lovable.dev/
  Discord: https://discord.gg/lovable
```

## ✅ قائمة التحقق للنشر

```
□ تفعيل النسخ الاحتياطي التلقائي في Lovable Cloud
□ إعداد bucket للتخزين الخارجي (اختياري)
□ إعداد سكريبت النسخ اليدوي
□ تكوين التنبيهات
□ اختبار الاستعادة الكاملة
□ توثيق الإجراءات
□ تدريب الفريق
□ جدولة المراجعات الدورية
```

## 🔄 تحديث الخطة

يجب مراجعة وتحديث هذه الخطة:
- **شهرياً**: مراجعة السجلات والتنبيهات
- **ربع سنوياً**: تحديث الإجراءات
- **سنوياً**: مراجعة شاملة وإعادة تقييم

---

**آخر تحديث**: 2025-01-20  
**الإصدار**: 1.0  
**الحالة**: جاهز للتنفيذ
