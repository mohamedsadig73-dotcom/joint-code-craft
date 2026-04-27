// Source-of-truth for the WMS Technical Review Report
// Used by: /inventory/review (in-app reader), DOCX/PDF generators, /inventory/qa

export type Severity = 'high' | 'medium' | 'low';

export interface ReportTable {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export interface ReportParagraph {
  type: 'p';
  text: string;
}

export interface ReportList {
  type: 'list';
  items: string[];
  ordered?: boolean;
}

export interface ReportCallout {
  type: 'callout';
  variant: 'info' | 'warning' | 'success' | 'danger';
  title?: string;
  text: string;
}

export type ReportBlock = ReportParagraph | ReportTable | ReportList | ReportCallout;

export interface ReportSection {
  id: string;
  title: string;
  blocks: ReportBlock[];
}

export interface WmsReviewReport {
  title: string;
  subtitle: string;
  version: string;
  date: string;
  author: string;
  sections: ReportSection[];
}

export const WMS_REVIEW_REPORT: WmsReviewReport = {
  title: 'تقرير المراجعة الفنية – نظام إدارة المخزن (WMS)',
  subtitle: 'تحليل شامل للأداء، البنية، الأمان، وتجربة المستخدم مع خارطة الربط بلوحة الصناديق',
  version: 'v1.0',
  date: new Date().toLocaleDateString('en-GB'),
  author: 'فريق التطوير – DTS Store',
  sections: [
    {
      id: 'exec-summary',
      title: '1. الملخص التنفيذي',
      blocks: [
        {
          type: 'p',
          text: 'يهدف هذا التقرير إلى مراجعة التعديلات الأخيرة على وحدة إدارة المخزن (WMS) ضمن النظام، وتقييمها من حيث الكفاءة، الهيكلية، الأمان، تجربة المستخدم، والاستعداد للربط مع وحدة لوحة الصناديق عبر سير عمل (Picking & Packing).',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'الخلاصة',
          text: 'الوحدة تعمل بشكل وظيفي مع وجود فرص تحسين ذات أولوية عالية في الأداء على الجوال، الترقيم، والربط البنيوي مع وحدة الصناديق.',
        },
      ],
    },
    {
      id: 'performance',
      title: '2. الأداء والكفاءة',
      blocks: [
        { type: 'p', text: 'تم رصد المخاطر الرئيسية التالية على الأداء عند التعامل مع بيانات كبيرة (آلاف الأصناف):' },
        {
          type: 'list',
          items: [
            'استخدام عنصر <Select> القياسي لاختيار الأصناف يؤدي إلى تجميد الواجهة على الجوال عند تجاوز 500 صنف.',
            'غياب الترقيم (Pagination) في شاشات الحركات والأرصدة يحمّل ذاكرة المتصفح بشكل خطي مع نمو البيانات.',
            'استعلامات stock_balances تجلب جميع الأرصدة دون فهرس مركّب على (warehouse_id, item_id).',
            'حسابات متوسط التكلفة تتم في PL/pgSQL بدون قفل صفّي (FOR UPDATE)، ما يزيد احتمال التزامن السلبي.',
          ],
        },
        {
          type: 'table',
          headers: ['المحور', 'الحالة الحالية', 'التحسين المقترح', 'الأولوية'],
          rows: [
            ['اختيار الأصناف', 'Select كامل', 'استبداله بـ ItemPickerCombobox', 'عالية'],
            ['ترقيم القوائم', 'تحميل 200 صف', 'Pagination 50/صفحة', 'عالية'],
            ['الفهارس', 'فهارس فردية', 'فهرس مركّب (warehouse_id, item_id)', 'متوسطة'],
            ['التزامن', 'بدون قفل', 'إضافة FOR UPDATE في الـ trigger', 'متوسطة'],
          ],
        },
      ],
    },
    {
      id: 'code-structure',
      title: '3. هيكلية الكود',
      blocks: [
        {
          type: 'list',
          items: [
            'الصفحات منفصلة بشكل جيد ضمن src/pages/inventory/* مع Lazy loading عبر AnimatedRoutes.',
            'وجود تكرار بسيط في منطق جلب الأرصدة بين StockBalances و StockCard – يمكن استخراجه إلى Hook موحّد.',
            'مكوّن ReferenceCrudTab معاد استخدامه بكفاءة عبر 7 جداول مرجعية.',
            'ينقص hook موحّد لـ usePaginatedQuery لتقنين منطق الترقيم.',
          ],
        },
      ],
    },
    {
      id: 'data-integrity',
      title: '4. سلامة البيانات والأمان',
      blocks: [
        {
          type: 'list',
          items: [
            'سياسات RLS مفعّلة على جميع جداول WMS (stock_movements, stock_balances, stock_counts).',
            'دالة post_stock_count تتحقق من الصلاحيات عبر has_role وتستخدم FOR UPDATE على رأس العملية.',
            'الـ trigger apply_stock_movement_to_balances ذرّي ضمن المعاملة، لكنه لا يقفل سطر الرصيد قبل التعديل.',
            'لا يوجد ربط بين box_receipts و stock_movements، مما يمنع تتبّع الصرف من المخزن إلى الصناديق.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'فجوة بنيوية',
          text: 'يجب إضافة source_type و source_id إلى stock_movements وحقل stock_movement_id إلى box_receipts لربط الحركات بمصادرها (يدوي / تعبئة صناديق / تسوية).',
        },
      ],
    },
    {
      id: 'scalability',
      title: '5. قابلية التوسع',
      blocks: [
        {
          type: 'list',
          items: [
            'البنية الحالية تدعم نمو الأصناف لـ 50,000 صف بشرط تطبيق الترقيم والفهارس المقترحة.',
            'إضافة طبقة Materialized View للأرصدة تعطي قفزة أداء كبيرة عند تجاوز 100,000 حركة.',
            'دعم عدة مستودعات متاح أصلاً عبر warehouse_id في كل الجداول.',
          ],
        },
      ],
    },
    {
      id: 'ux',
      title: '6. تجربة المستخدم (UX)',
      blocks: [
        {
          type: 'list',
          items: [
            'هيدر شاشة /inventory مكتظ بـ 6 أزرار + 7 تبويبات → يلزم تجميعها في DropdownMenu للجوال.',
            'الجداول الأفقية (7 أعمدة) تخرج عن الشاشة عند 430px → تحويلها إلى بطاقات (Cards) كما في وحدة الصناديق.',
            'حقول البحث موجودة لكن بدون فهرسة نصية – يمكن إضافة GIN index على description.',
            'لا توجد حالات فارغة (Empty States) موحّدة عبر شاشات WMS.',
          ],
        },
      ],
    },
    {
      id: 'integration',
      title: '7. خارطة الربط مع لوحة الصناديق',
      blocks: [
        {
          type: 'p',
          text: 'سير العمل المستهدف: المورد → استلام → مخزن مؤقت → تعبئة صناديق (سحب من المخزون تلقائياً) → شحن.',
        },
        {
          type: 'table',
          headers: ['التغيير', 'الجدول/الكائن', 'الغرض', 'المرحلة'],
          rows: [
            ['إضافة source_type', 'stock_movements', 'تصنيف مصدر الحركة', '1'],
            ['إضافة source_id', 'stock_movements', 'ربط الحركة بالكائن المصدر', '1'],
            ['إضافة stock_movement_id', 'box_receipts', 'ربط الصنف داخل الصندوق بحركة الصرف', '2'],
            ['دالة issue_for_box_packing', 'RPC', 'صرف ذرّي عند تعبئة الصندوق', '2'],
            ['توحيد UoM', 'units_of_measure', 'إلغاء الـ free-text في الصناديق', '3'],
          ],
        },
      ],
    },
    {
      id: 'recommendations',
      title: '8. التوصيات حسب الأولوية',
      blocks: [
        {
          type: 'table',
          headers: ['#', 'التوصية', 'الأولوية', 'الأثر المتوقع'],
          rows: [
            ['1', 'استبدال Select بـ ItemPickerCombobox في نماذج الحركات', 'عالية', 'تحسّن أداء جذري على الجوال'],
            ['2', 'تطبيق Pagination 50/صفحة على الحركات والأرصدة', 'عالية', 'استقرار الذاكرة عند نمو البيانات'],
            ['3', 'تجميع أزرار هيدر /inventory ضمن DropdownMenu', 'عالية', 'تنظيف بصري وتحسين الجوال'],
            ['4', 'إضافة source_type/source_id لـ stock_movements', 'عالية', 'تمكين الربط مع الصناديق'],
            ['5', 'تحويل جداول WMS إلى بطاقات على الجوال', 'متوسطة', 'تجربة مستخدم متسقة'],
            ['6', 'فهرس مركّب (warehouse_id, item_id) على stock_balances', 'متوسطة', 'تسريع الاستعلامات'],
            ['7', 'Materialized View للأرصدة', 'منخفضة', 'تجهيز للتوسع المستقبلي'],
          ],
        },
        {
          type: 'callout',
          variant: 'success',
          title: 'التطبيق التلقائي',
          text: 'تم تنفيذ التوصيات ذات الأولوية العالية رقم 1, 2, 3 تلقائياً ضمن هذه الجولة (راجع ملخص التغييرات في صفحة QA).',
        },
      ],
    },
  ],
};
