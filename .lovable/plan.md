# خطة إعادة الهيكلة المعمارية (Architectural Refactor Plan)

أتفق مع تشخيصك بشكل كامل. النظام يعاني من **Feature-by-Feature growth** بدون طبقات معمارية. الخطة تالياً مقسّمة إلى **4 مراحل تدريجية** — كل مرحلة قابلة للنشر منفردة بدون كسر النظام.

---

## المبادئ الحاكمة

1. **Refactor تدريجي** — لا rewrite. كل خطوة تُنشر وتُختبر قبل التالية.
2. **Backwards compatible** — المسارات القديمة تبقى عبر redirects حتى نزيلها.
3. **Strangler Pattern** — ننشئ الطبقة الجديدة بجانب القديمة، نهاجر الاستدعاءات، نحذف القديم.
4. **No big-bang** — كل PR ≤ ~10 ملفات.

---

## P1 — توحيد Navigation و Shell (أولوية حمراء)

**المشكلة:** `MobileBottomNav` + `AppShell` + `Navigation.tsx` + `NavLink.tsx` + `FAB` كلها تتنافس على نفس المسؤولية.

**الإجراء:**
- حذف `src/components/Navigation.tsx` (legacy، غير مستخدم في AppShell).
- توحيد مصدر روابط التنقل في ملف واحد: `src/config/navigation.ts` يصدّر `navModules` (نفس البنية المستخدمة في `AppSidebar`)، ثم يستهلكه كلٌّ من:
  - `AppSidebar` (Desktop)
  - `MobileBottomNav` (Mobile primary + More sheet)
  - `Home` launcher cards
- `FAB` → يصبح **context-aware** فقط: يقرأ من `useFabContext()` الذي تحدده كل صفحة (action واحد افتراضي + قائمة ثانوية)، بدل ما يحتوي منطق `Create Declaration` بداخله.
- إبقاء `MobileBottomNav` لكن كـ **عرض mobile لنفس navigation.ts** — لا منطق منفصل.

---

## P2 — Service Layer + توحيد العمليات الحرجة

**المشكلة:** نفس العملية (مثلاً Create Receipt Voucher) تُستدعى من Dialog، FAB، Dashboard، Quick Action — كل واحدة تكتب الـ Supabase call بشكل مختلف.

**الإجراء:** إنشاء طبقة Services نقية (لا تعرف React):

```text
src/services/
├── vouchersService.ts      (createReceipt, createIssue, createOpening, list, void)
├── inventoryService.ts     (adjustStock, transfer, count)
├── boxesService.ts         (createBox, dispatch, transferAsset)
├── maintenanceService.ts   (createTask, scheduleAnnual, complete)
├── employeesService.ts
├── pettyCashService.ts
└── _shared/
    ├── softDelete.ts       (سياسة 30 يوم موحدة)
    ├── auditLog.ts         (write audit entries)
    └── supabaseErrors.ts   (mapping موحد للأخطاء)
```

ثم Hooks رفيعة فوقها (React Query wrappers فقط):
```text
src/hooks/data/
├── useVouchers.ts          → vouchersService
├── useInventory.ts         → inventoryService
└── ...
```

**القاعدة الجديدة:** أي ملف داخل `src/components/` أو `src/pages/` **ممنوع** استدعاء `supabase.from(...)` مباشرة — لازم يمر بـ service. (نضيف ESLint rule لاحقاً.)

**العمليات الحرجة الموحدة (Wizards):**
- `<CreateVoucherWizard type="receipt|issue|opening" />` — نقطة دخول واحدة، تستبدل `CreateDeclarationDialog` + `VoucherForm` المتفرقة.
- `<CreateBoxWizard />`
- `<CreateMaintenanceWizard />`

أي زر/FAB/Quick action يفتح نفس الـ Wizard.

---

## P3 — Modules (دمج الصفحات المتشظية)

**المشكلة:** كل sub-feature له صفحة مستقلة → 40+ pages.

**البنية الجديدة:**

```text
src/modules/
├── inventory/
│   ├── InventoryModule.tsx        (الصفحة الأم — تابات)
│   ├── tabs/ (Stock, Alerts, Counts, Custody, Locations, Transactions)
│   ├── components/ (drawers, dialogs, cards)
│   └── hooks/
│
├── vouchers/
│   ├── VouchersModule.tsx         (يدمج VouchersHub + Declarations القديمة)
│   ├── tabs/ (Receipt, Issue, Opening, Movements)
│   └── components/ (CreateVoucherWizard, VoucherDetailsDrawer)
│
├── boxes/
│   ├── BoxesModule.tsx            (يدمج BoxesManagement + ContainerDetails + BoxCardPrint كـ drawer/print preview)
│   ├── tabs/ (Receipts, Containers, Dispatches, Items, Packing, Summary)
│   └── components/
│
├── maintenance/
│   ├── MaintenanceModule.tsx
│   └── tabs/ (Dashboard, Tasks, Schedule, Assets, Vendors)
│
├── office/
│   ├── employees/
│   ├── leaves/
│   ├── holiday/
│   └── pettyCash/
│
├── reports/
│   └── ReportsModule.tsx          (دمج ReportsAnalytics + ReportsHub + WmsReports)
│
└── admin/
    ├── AdminModule.tsx            (Settings Hub + Audit + RLS Diagnostics + Users)
    └── ... (محمية بـ guard على مستوى الـ module)
```

**الصفحات المحذوفة (مع redirects):**
- `BoxCardPrint`, `ContainerDetails`, `BoxesDataAdmin` → داخل BoxesModule كـ drawers/print routes.
- `StockAlerts`, `StockCounts`, `Inventory` (current) → tabs داخل InventoryModule.
- `Dashboard`, `SmartDashboard`, `WmsDashboard` → نختار **واحدة** كـ Home + الباقي يُحذف (redirect إلى `/`).
- `ReportsAnalytics`, `ReportsHub`, `WmsReports` → ReportsModule واحد.

**Routing:**
```text
/inventory/:tab
/vouchers/:tab
/boxes/:tab
/maintenance/:tab
/office/:section
/reports/:tab
/admin/:section
```

---

## P4 — توحيد Shared Components & Print Engine

**المشكلة:** طباعة في 4 أماكن (`BoxCardPrint`, `boxesTotalsPdf`, `excelExport`, `printDocument`) كل واحدة بنمط مختلف.

**الإجراء:**

### Print Engine موحّد
```text
src/lib/print/
├── PrintEngine.ts              (واجهة موحدة: print(template, data, options))
├── adapters/
│   ├── webIframeAdapter.ts     (iframe + Blob — للـ Web)
│   └── electronAdapter.ts      (webContents.printToPDF + shell.openPath)
├── templates/
│   ├── BoxCardTemplate.tsx
│   ├── ReceiptVoucherTemplate.tsx
│   ├── HolidayAttendanceTemplate.tsx
│   └── PettyCashTemplate.tsx
└── usePrint.ts                 (hook رفيع)
```

أي صفحة تطبع: `usePrint().print('boxCard', data)` — لا أكثر.

### Shared UI Components (نظفها وثبّتها)
موجود فعلاً وجيد، لكن نوحّد ونغطّي الفجوات:
- `<DataTable />` — generic مع sort/filter/pagination/bulk-select (يستبدل الجداول المتفرقة).
- `<EntityFormDrawer />` — موجود ✓ — نعمّمه على باقي الفورمات.
- `<UnifiedFilterBar />` — موجود ✓ — تعميم على Suppliers, Maintenance, Stock Counts.
- `<WmsBulkActionsBar />`, `<WmsEmptyState />`, `<WmsSkeleton />` — موجودة ✓ — تعميم.
- `<StandardModal />` — موجود ✓ — هجرة الـ Dialogs المتبقية (Maintenance, Items, Boxes, Suppliers, Employees forms).

### ESLint Guards
- منع `supabase.from` خارج `src/services/`.
- منع import من `pages/` إلى `pages/` (الصفحات لا تستورد بعض).
- حد أقصى 300 سطر للملف (memory rule موجود).

---

## ترتيب التنفيذ المقترح (sprints)

| Sprint | مدة تقديرية | محتوى |
|--------|-------------|-------|
| S1 | صغير | P1 كامل: navigation.ts + حذف Navigation.tsx + FAB context-aware |
| S2 | متوسط | P2: services skeleton + هجرة Vouchers + Inventory فقط |
| S3 | متوسط | P2 تكملة: Boxes + Maintenance + PettyCash services |
| S4 | كبير | P3: InventoryModule + VouchersModule + redirects |
| S5 | كبير | P3 تكملة: BoxesModule + MaintenanceModule + ReportsModule |
| S6 | متوسط | P4: PrintEngine + توحيد Dialogs المتبقية + ESLint guards |
| S7 | صغير | تنظيف: حذف pages/components legacy، تحديث docs |

---

## ما الذي سيتغير من منظور المستخدم؟

- **لا شيء وظيفياً** — كل الميزات الموجودة تبقى. فقط:
  - تنقّل أبسط (نفس الروابط في كل مكان).
  - زر إنشاء واحد لكل عملية (لا تكرار).
  - طباعة موحدة الشكل.
  - استجابة أسرع (lazy modules بدل lazy pages).

---

## ما الذي أحتاج تأكيده منك قبل البدء بـ S1؟

1. **هل أبدأ فعلياً بـ S1 (Navigation unification + FAB) في الـ loop القادم؟** أم تفضّل أبدأ بـ S2 (Services Layer) لأنه الأهم معمارياً؟
2. **Dashboards الثلاثة** (`Dashboard`, `SmartDashboard`, `WmsDashboard`) — أيها نُبقي كـ Home الرسمي؟ توصيتي: `WmsDashboard` (الأحدث والأكثر شمولاً) + redirects للباقي.
3. **هل توافق على قاعدة "ممنوع `supabase.from` خارج services"** كقاعدة ESLint صارمة؟
