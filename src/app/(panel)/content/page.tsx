"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  ImageOff,
  Layers,
  LayoutTemplate,
  Link2,
  Lock,
  MessageSquare,
  MoveUpRight,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Toggle from "@/components/ui/Toggle";
import BannerFormDialog from "@/components/admin/BannerFormDialog";
import { formatDate } from "@/lib/format";
import { useFlash } from "@/lib/useFlash";
import { t } from "@/lib/strings";
import type { Banner, BannerPayload, StaticPageKey } from "@/lib/admin/types";

interface ExtendedStaticPage {
  key: string;
  title: string;
  body: string;
  icon: typeof FileText;
  badge: string;
  updatedAt: string;
}

interface OccasionItem {
  id: number;
  name: string;
  icon: string;
  description: string;
  isActive: boolean;
  isFeaturedOnHome: boolean;
  categories: string[];
}

// ─── بيانات الـ Mock المنسقة والغنية للصفحة ─────────────────────

const INITIAL_BANNERS: Banner[] = [
  {
    id: 1,
    title: "تخفيضات موسم الصيف الكبرى 2026 — خصم حتى 50%",
    imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop",
    linkUrl: "/offers",
    position: 1,
    isActive: true,
    startsAt: "2026-06-01T00:00:00Z",
    endsAt: "2026-08-31T23:59:59Z",
  },
  {
    id: 2,
    title: "تشكيلة العيد الفاخرة — أرقى الأزياء والفساتين النسائية",
    imageUrl: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1200&auto=format&fit=crop",
    linkUrl: "/collections/eid-luxe",
    position: 2,
    isActive: true,
    startsAt: "2026-04-10T00:00:00Z",
    endsAt: null,
  },
  {
    id: 3,
    title: "أحدث صيحات الأحذية والحقائب الجلدية الفاخرة",
    imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1200&auto=format&fit=crop",
    linkUrl: "/categories/shoes-bags",
    position: 3,
    isActive: true,
    startsAt: null,
    endsAt: null,
  },
  {
    id: 4,
    title: "عروض العودة للمدارس والجامعات — خصومات حصرية للطلاب",
    imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&auto=format&fit=crop",
    linkUrl: "/collections/back-to-school",
    position: 4,
    isActive: false,
    startsAt: "2026-09-01T00:00:00Z",
    endsAt: "2026-09-30T23:59:59Z",
  },
];

const INITIAL_PAGES: ExtendedStaticPage[] = [
  {
    key: "terms",
    title: "شروط وأحكام استخدام منصة فيورا",
    icon: FileText,
    badge: "قانوني",
    updatedAt: "2026-08-15T12:00:00Z",
    body: `مرحباً بك في منصة فيورا (Viora). يُرجى قراءة شروط وأحكام الاستخدام بعناية قبل استخدام موقعنا وتطبيقاتنا.

١. أهلية الاستخدام والتسجيل:
- باستخدامك للمنصة، فإنك تقر بأنك تبلغ من العمر 18 عاماً على الأقل، أو تستخدم المنصة تحت إشراف ولي الأمر.
- يلتزم المستخدم بتقديم بيانات دقيقة وكاملة أثناء التسجيل وتحمل مسؤولية سرية بيانات الحساب.

٢. الطلبات والشراء والتوصيل:
- يتم تأكيد الطلبات بعد المراجعة وتخضع لتوفر المنتج لدى المتجر المعني.
- تلتزم المنصة بتوصيل الطلبات وفق الأوقات المحددة عبر شركاء الشحن المعتمدين.

٣. حقوق الملكية الفكرية:
- جميع العلامات التجارية والتصاميم والمحتوى المنشور على المنصة هي ملك حصري لمنصة فيورا ومحمي بموجب الأنظمة والقوانين.

٤. حدود المسؤولية:
- تسعى فيورا لضمان دقة مواصفات المنتجات وصورها، ولكنها غير مسؤولة عن التغييرات الطفيفة في ألوان العرض الناتجة عن شاشات الأجهزة.`,
  },
  {
    key: "privacy",
    title: "سياسة الخصوصية وحماية بيانات المستخدمين",
    icon: ShieldCheck,
    badge: "أمان",
    updatedAt: "2026-08-20T10:30:00Z",
    body: `تولي منصة فيورا أهمية قصوى لسرية وخصوصية بياناتكم الشخصية.

١. المعلومات التي نجمعها:
- المعلومات الشخصية: الاسم، البريد الإلكتروني، رقم الهاتف، وعناوين التوصيل المسجلة.
- معلومات التصفح: سجل الطلبات، المنتجات المفضلة، وسجلات التفاعل داخل التطبيق لتحسين التجربة.

٢. كيف نستخدم معلوماتك:
- معالجة وإتمام طلبات الشراء والشحن مع المتاجر وشركات التوصيل.
- إرسال إشعارات حالة الطلب والعروض الترويجية الحصرية بعد موافقتك.
- تحسين أداء المنصة وتطوير خدمات الدعم الفني.

٣. حماية البيانات وعدم مشاركتها:
- لا نقوم ببيع أو تأجير بياناتك الشخصية لأي طرف ثالث. تُشارك البيانات الضرورية فقط مع شريك التوصيل لإتمام الشحنة بأمان.`,
  },
  {
    key: "returns",
    title: "سياسة الإرجاع والاستبدال واسترداد الأموال",
    icon: RotateCcw,
    badge: "خدمة العملاء",
    updatedAt: "2026-07-25T14:15:00Z",
    body: `حرصاً على رضاكم التام، توفر منصة فيورا سياسة إرجاع واستبدال ميسرة وعادلة:

١. شروط الاستبدال والإرجاع:
- يحق للزبون طلب إرجاع أو استبدال المنتج خلال ٣ أيام من تاريخ استلام الشحنة.
- يجب أن يكون المنتج بحالته الأصلية، غير مستخدم، وبكامل ملصقاته وتغليفه الأصلي.

٢. المنتجات المستثناة من الإرجاع:
- لأسباب صحية ووقائية، لا يمكن إرجاع الملابس الداخلية، مستحضرات التجميل، والعطور بعد فتحها.

٣. آلية استرداد المبالغ:
- بعد فحص المنتج والتأكد من سلامته، يتم استرداد المبلغ بنفس وسيلة الدفع المستخدمة خلال ٥-٧ أيام عمل.`,
  },
  {
    key: "about",
    title: "عن منصة فيورا (About Viora)",
    icon: ShoppingBag,
    badge: "تعريفي",
    updatedAt: "2026-05-10T09:00:00Z",
    body: `فيورا (Viora) هي الوجهة الرائدة الأولى للتسوق الإلكتروني للأزياء والموضة والمتاجر المحلية.

رؤيتنا:
تمكين المتاجر ورواد الأعمال في فلسطين والمنطقة من الوصول إلى ملايين الزبائن عبر منصة تقنية متطورة، وتوفير تجربة تسوق سلسة وفاخرة تجمع كل الماركات المفضلة في مكان واحد مع خدمة توصيل موثوقة حتى باب المنزل.

قيمنا الأساسية:
- الجودة والأصالة في كل قطعة معروضة.
- تجربة مستخدم عصرية وسريعة.
- دعم الاقتصاد المحلي والتجار المبدعين.`,
  },
];

const INITIAL_OCCASIONS: OccasionItem[] = [
  {
    id: 1,
    name: "يومي وكاجوال",
    icon: "☕",
    description: "إطلالات مريحة للمشاوير اليومية، الجامعة، والتسوق.",
    isActive: true,
    isFeaturedOnHome: true,
    categories: ["ملابس نسائية", "ملابس رجالية", "أحذية"],
  },
  {
    id: 2,
    name: "سهرة ومناسبات خاصة",
    icon: "✨",
    description: "فساتين سهرة راقية، بدل توكسيدو، وأحذية كعب لامعة.",
    isActive: true,
    isFeaturedOnHome: true,
    categories: ["فساتين سهرة", "إكسسوارات وحقائب"],
  },
  {
    id: 3,
    name: "تشكيلة العيد والأفراح",
    icon: "🌙",
    description: "أطقم العيد الجديدة والعبايات والجلابيب والقفاطين الفاخرة.",
    isActive: true,
    isFeaturedOnHome: true,
    categories: ["ملابس نسائية", "ملابس رجالية", "أطفال ومحير"],
  },
  {
    id: 4,
    name: "عمل ورسمي (Workwear)",
    icon: "💼",
    description: "بدل رسمية، بليزرات، قمصان، وأحذية كلاسيكية للمكتب.",
    isActive: true,
    isFeaturedOnHome: false,
    categories: ["ملابس رجالية", "ملابس نسائية"],
  },
  {
    id: 5,
    name: "رياضة ونشاطات",
    icon: "🏃‍♂️",
    description: "ملابس رياضية، سنيكرز، أطقم تدريب، وترنقات نشطة.",
    isActive: true,
    isFeaturedOnHome: false,
    categories: ["أحذية رياضية", "ملابس رياضية"],
  },
];

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<"banners" | "home" | "pages" | "occasions">("banners");

  // Banners State
  const [banners, setBanners] = useState<Banner[]>(INITIAL_BANNERS);
  const [bannerForm, setBannerForm] = useState<Banner | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Banner | null>(null);

  // Home Storefront State
  const [heroTitle, setHeroTitle] = useState("كل متاجرك المفضّلة في مكان واحد");
  const [heroSubtitle, setHeroSubtitle] = useState("تسوقي أرقى أزياء الموضة، الفساتين، والإكسسوارات من مئات المتاجر المحلية مع توصيل سريع.");
  const [heroCtaText, setHeroCtaText] = useState("اكتشف أحدث التشكيلات");
  const [heroBadge, setHeroBadge] = useState("✨ توصيل متوفر لكافة المحافظات");
  const [heroBgUrl, setHeroBgUrl] = useState("https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop");

  // Static Pages State
  const [pages, setPages] = useState<ExtendedStaticPage[]>(INITIAL_PAGES);
  const [selectedPageKey, setSelectedPageKey] = useState<string>("terms");
  const [editorTitle, setEditorTitle] = useState(INITIAL_PAGES[0].title);
  const [editorBody, setEditorBody] = useState(INITIAL_PAGES[0].body);

  // Occasions State
  const [occasions, setOccasions] = useState<OccasionItem[]>(INITIAL_OCCASIONS);

  const [flash, showFlash] = useFlash();

  const selectedPage = pages.find((p) => p.key === selectedPageKey) || pages[0];

  // Change active page in editor
  const handleSelectPage = (page: ExtendedStaticPage) => {
    setSelectedPageKey(page.key);
    setEditorTitle(page.title);
    setEditorBody(page.body);
  };

  // Toggle Banner Status
  const handleToggleBanner = (id: number) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b)),
    );
    showFlash("تم تحديث حالة البانر الإعلاني بنجاح");
  };

  // Delete Banner
  const handleDeleteBanner = () => {
    if (!pendingDelete) return;
    setBanners((prev) => prev.filter((b) => b.id !== pendingDelete.id));
    setPendingDelete(null);
    showFlash("تم حذف البانر بنجاح");
  };

  // Save Banner (Add or Edit)
  const handleSaveBanner = (payload: BannerPayload) => {
    if (bannerForm === "new") {
      const newBanner: Banner = {
        id: Date.now(),
        title: payload.title,
        imageUrl: payload.imageUrl,
        linkUrl: payload.linkUrl,
        position: banners.length + 1,
        isActive: payload.isActive,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
      };
      setBanners((prev) => [newBanner, ...prev]);
      showFlash("تم إنشاء البانر الترويجي بنجاح");
    } else if (bannerForm && typeof bannerForm === "object") {
      setBanners((prev) =>
        prev.map((b) =>
          b.id === bannerForm.id
            ? {
                ...b,
                title: payload.title,
                imageUrl: payload.imageUrl,
                linkUrl: payload.linkUrl,
                isActive: payload.isActive,
              }
            : b,
        ),
      );
      showFlash("تم تعديل بيانات البانر بنجاح");
    }
    setBannerForm(null);
  };

  // Save Home Settings
  const handleSaveHome = () => {
    showFlash("تم حفظ إعدادات وتصميم الصفحة الرئيسية بنجاح");
  };

  // Save Page Content
  const handleSavePage = () => {
    setPages((prev) =>
      prev.map((p) =>
        p.key === selectedPageKey
          ? { ...p, title: editorTitle, body: editorBody, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
    showFlash(`تم حفظ وتحديث صفحة "${editorTitle}" بنجاح`);
  };

  // Toggle Occasion Featured
  const handleToggleOccasion = (id: number) => {
    setOccasions((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, isFeaturedOnHome: !o.isFeaturedOnHome } : o,
      ),
    );
    showFlash("تم تحديث حالة العرض بالصفحة الرئيسية");
  };

  // KPI Calculations
  const activeBannersCount = banners.filter((b) => b.isActive).length;
  const activeOccasionsCount = occasions.filter((o) => o.isFeaturedOnHome).length;

  return (
    <div className="flex flex-col gap-6">
      {/* 🌟 Top Page Header with Live Mock Indicator */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-heading">
              إدارة المحتوى والواجهة
            </h1>
            <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-extrabold text-primary">
              <Sparkles className="size-3" />
              وضع المعاينة والتحكم
            </span>
          </div>
          <p className="mt-1 text-xs font-bold text-text-secondary">
            التحكم في البانرات الإعلانية، أقسام الصفحة الرئيسية، الصفحات التعريفية والشروط، وتخصيص تجربة المستخدم.
          </p>
        </div>

        {flash && (
          <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft px-4 py-2.5 text-xs font-extrabold text-success shadow-xs">
            <Check className="size-4" />
            <span>{flash}</span>
          </div>
        )}
      </div>

      {/* 📊 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-text-secondary">
                البانرات الإعلانية النشطة
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="ltr-nums text-2xl font-black text-heading">
                  {activeBannersCount}
                </span>
                <span className="text-xs font-bold text-text-secondary">
                  / {banners.length} إجمالي
                </span>
              </div>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <ImageIcon className="size-6" />
            </span>
          </div>
          <p className="mt-2 text-[11px] font-bold text-text-secondary/80">
            تظهر في الشريط الدوار بالتطبيق
          </p>
        </Card>

        <Card className="border border-border/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-text-secondary">
                الصفحات التعريفية المنشورة
              </span>
              <span className="ltr-nums mt-1 text-2xl font-black text-heading">
                {pages.length} صفحات
              </span>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-info-soft text-info">
              <FileText className="size-6" />
            </span>
          </div>
          <p className="mt-2 text-[11px] font-bold text-text-secondary/80">
            الشروط، الخصوصية، الإرجاع، من نحن
          </p>
        </Card>

        <Card className="border border-border/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-text-secondary">
                مناسبات التسوق المميزة
              </span>
              <span className="ltr-nums mt-1 text-2xl font-black text-heading">
                {activeOccasionsCount} معروضة
              </span>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
              <Sparkles className="size-6" />
            </span>
          </div>
          <p className="mt-2 text-[11px] font-bold text-text-secondary/80">
            تظهر بأيقونات في الصفحة الرئيسية
          </p>
        </Card>

        <Card className="border border-border/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-text-secondary">
                جاهزية وتناسق المحتوى
              </span>
              <span className="ltr-nums mt-1 text-2xl font-black text-success">
                100% مكتمل
              </span>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-success-soft text-success">
              <ShieldCheck className="size-6" />
            </span>
          </div>
          <p className="mt-2 text-[11px] font-bold text-text-secondary/80">
            جميع النصوص والروابط مهيئة
          </p>
        </Card>
      </div>

      {/* 🧭 Modern Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 pb-3">
        {[
          { key: "banners", label: "البانرات والعروض الترويجية", icon: ImageIcon, count: banners.length },
          { key: "home", label: "تخصيص الصفحة الرئيسية (Home)", icon: LayoutTemplate },
          { key: "pages", label: "الصفحات الثابتة والسياسات", icon: FileText, count: pages.length },
          { key: "occasions", label: "مناسبات وحملات التسوق", icon: Sparkles, count: occasions.length },
        ].map((item) => {
          const isActive = activeTab === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key as typeof activeTab)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
                isActive
                  ? "bg-primary text-white shadow-xs"
                  : "border border-border/80 bg-surface text-text-secondary hover:border-primary/40 hover:text-heading"
              }`}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
              {typeof item.count === "number" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-field-bg text-text-secondary"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          TAB 1: البانرات الترويجية (Banners)
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "banners" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-heading">
                قائمة البانرات والعروض الإعلانية
              </h2>
              <p className="text-xs font-medium text-text-secondary">
                تظهر هذه البانرات كشريط منزلق رئيسي في أعلى تطبيق وموقع فيورا.
              </p>
            </div>

            <Button
              onClick={() => setBannerForm("new")}
              icon={<Plus className="size-4" />}
            >
              إضافة بانر جديد
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {banners.map((banner, index) => (
              <Card
                key={banner.id}
                className={`overflow-hidden border transition ${
                  banner.isActive
                    ? "border-border/80 bg-surface shadow-xs hover:border-primary/40"
                    : "border-border/40 bg-field-bg/40 opacity-75"
                }`}
              >
                {/* Banner Image Preview with Status Pill Overlay */}
                <div className="relative aspect-21/9 w-full overflow-hidden bg-field-bg">
                  {banner.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="size-full object-cover transition duration-300 hover:scale-102"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-text-secondary/60">
                      <ImageOff className="size-8" />
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute right-3 top-3 flex items-center gap-2">
                    <span className="rounded-lg bg-black/60 px-2 py-1 text-[11px] font-black text-white backdrop-blur-xs">
                      ترتيب #{index + 1}
                    </span>
                    {banner.isActive ? (
                      <span className="flex items-center gap-1 rounded-lg bg-success px-2 py-1 text-[11px] font-black text-white shadow-xs">
                        <Check className="size-3" />
                        نشط ومعروض
                      </span>
                    ) : (
                      <span className="rounded-lg bg-neutral-700/80 px-2 py-1 text-[11px] font-black text-white backdrop-blur-xs">
                        معطّل
                      </span>
                    )}
                  </div>
                </div>

                {/* Banner Content Body */}
                <div className="p-5">
                  <h3 className="text-sm font-black leading-snug text-heading">
                    {banner.title}
                  </h3>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                    {banner.linkUrl ? (
                      <div className="flex items-center gap-1 font-bold text-info">
                        <Link2 className="size-3.5" />
                        <span className="ltr-nums">{banner.linkUrl}</span>
                      </div>
                    ) : (
                      <span className="text-text-secondary/60">بدون رابط تحويل</span>
                    )}

                    {banner.startsAt && (
                      <div className="flex items-center gap-1 ltr-nums text-text-secondary/80">
                        <Calendar className="size-3.5" />
                        <span>من: {formatDate(banner.startsAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                    <div className="flex items-center gap-2">
                      <Toggle
                        checked={banner.isActive}
                        onChange={() => handleToggleBanner(banner.id)}
                        label={banner.isActive ? "نشط" : "معطل"}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setBannerForm(banner)}
                        icon={<Pencil className="size-3.5" />}
                      >
                        تعديل
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setPendingDelete(banner)}
                        icon={<Trash2 className="size-3.5" />}
                      >
                        حذف
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 2: تخصيص الصفحة الرئيسية (Home & Live Mobile Preview)
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "home" && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Form Settings (7 cols) */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            <Card className="border border-border/80 shadow-xs">
              <CardHeader
                title="تخصيص الهيرو والواجهة الرئيسية (Hero Section)"
                action={
                  <span className="text-xs font-bold text-primary">
                    تحديث فوري بالمعاينة 📱
                  </span>
                }
              />
              <CardBody className="space-y-4 p-5">
                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-heading">
                    شريط التنبيه العلوي (Announcement Badge)
                  </label>
                  <input
                    type="text"
                    value={heroBadge}
                    onChange={(e) => setHeroBadge(e.target.value)}
                    className="h-10.5 w-full rounded-xl border border-border bg-field-bg/40 px-3.5 text-sm text-heading focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-heading">
                    العنوان الرئيسي للهيرو (Hero Main Title)
                  </label>
                  <input
                    type="text"
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    className="h-10.5 w-full rounded-xl border border-border bg-field-bg/40 px-3.5 text-sm font-bold text-heading focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-heading">
                    النص الوصفي الترحيبي (Hero Subtitle)
                  </label>
                  <textarea
                    rows={3}
                    value={heroSubtitle}
                    onChange={(e) => setHeroSubtitle(e.target.value)}
                    className="w-full rounded-xl border border-border bg-field-bg/40 p-3.5 text-sm text-heading leading-relaxed focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-heading">
                    نص زر الشراء (Call to Action Button)
                  </label>
                  <input
                    type="text"
                    value={heroCtaText}
                    onChange={(e) => setHeroCtaText(e.target.value)}
                    className="h-10.5 w-full rounded-xl border border-border bg-field-bg/40 px-3.5 text-sm text-heading focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-heading">
                    رابط صورة الخلفية أو الغلاف (Hero Background Image URL)
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    value={heroBgUrl}
                    onChange={(e) => setHeroBgUrl(e.target.value)}
                    className="h-10.5 w-full rounded-xl border border-border bg-field-bg/40 px-3.5 text-sm text-heading focus:border-primary focus:outline-hidden"
                  />
                  <p className="mt-1.5 text-[11px] text-text-secondary">
                    يُفضل استخدام صورة بجودة عالية وأبعاد عريضة (1920x800).
                  </p>
                </div>

                <div className="flex justify-end pt-3">
                  <Button onClick={handleSaveHome} icon={<Save className="size-4" />}>
                    حفظ التغييرات ونشرها
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Live Mobile Simulation (5 cols) */}
          <div className="flex flex-col items-center lg:col-span-5">
            <div className="sticky top-6 flex flex-col items-center">
              <div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-heading">
                <Smartphone className="size-4 text-primary" />
                <span>معاينة حية لتطبيق وموقع الموبايل</span>
              </div>

              {/* Realistic Phone Frame */}
              <div className="relative w-[310px] overflow-hidden rounded-[40px] border-[10px] border-neutral-800 bg-app-bg shadow-2xl">
                {/* Speaker Notch */}
                <div className="absolute left-1/2 top-2 h-4 w-28 -translate-x-1/2 rounded-full bg-neutral-900" />

                {/* Mobile Header Bar */}
                <div className="flex items-center justify-between border-b border-border/40 bg-surface px-4 pb-2.5 pt-7 text-xs">
                  <span className="font-black text-primary">VIORA</span>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-success" />
                    <span className="text-[10px] font-bold text-text-secondary">مباشر</span>
                  </div>
                </div>

                {/* Mobile Screen Scroll Content */}
                <div className="max-h-[500px] overflow-y-auto p-3.5 text-right">
                  {/* Hero Card */}
                  <div className="relative overflow-hidden rounded-2xl bg-neutral-900 p-4 text-white shadow-md">
                    {/* Background Overlay */}
                    {heroBgUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={heroBgUrl}
                        alt="Hero"
                        className="absolute inset-0 size-full object-cover opacity-40"
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-start gap-2">
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-black backdrop-blur-xs">
                        {heroBadge}
                      </span>
                      <h4 className="text-sm font-black leading-tight">
                        {heroTitle}
                      </h4>
                      <p className="text-[11px] leading-relaxed text-white/80 line-clamp-2">
                        {heroSubtitle}
                      </p>
                      <button
                        type="button"
                        className="mt-1 flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-black text-white shadow-xs"
                      >
                        <span>{heroCtaText}</span>
                        <ChevronLeft className="size-3" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Occasions Horizontal Bar in Mobile */}
                  <div className="mt-4">
                    <p className="text-[11px] font-black text-heading">أقسام التسوق السريع</p>
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {occasions.filter(o => o.isFeaturedOnHome).map((occ) => (
                        <div
                          key={occ.id}
                          className="flex shrink-0 flex-col items-center gap-1 rounded-xl border border-border/60 bg-surface p-2 text-center shadow-2xs"
                        >
                          <span className="text-base">{occ.icon}</span>
                          <span className="text-[10px] font-bold text-heading whitespace-nowrap">
                            {occ.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Featured Banner in Mobile */}
                  {banners[0] && banners[0].isActive && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-border/60 shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={banners[0].imageUrl}
                        alt="Promo"
                        className="h-24 w-full object-cover"
                      />
                      <div className="bg-surface p-2 text-[10px] font-bold text-heading">
                        {banners[0].title}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 3: الصفحات الثابتة والسياسات (Static Pages & Policies)
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "pages" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Sidebar: Pages Selector (4 cols) */}
          <div className="flex flex-col gap-3 lg:col-span-4">
            <Card className="border border-border/80 shadow-xs">
              <CardHeader title="الصفحات القانونية والتعريفية" />
              <CardBody className="space-y-2 p-3">
                {pages.map((page) => {
                  const isSelected = selectedPageKey === page.key;
                  const Icon = page.icon;
                  return (
                    <button
                      key={page.key}
                      type="button"
                      onClick={() => handleSelectPage(page)}
                      className={`flex w-full items-center justify-between rounded-xl p-3 text-right transition ${
                        isSelected
                          ? "border border-primary/30 bg-primary-soft/80 text-primary shadow-xs"
                          : "border border-transparent bg-field-bg/40 text-heading hover:bg-field-bg"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm ${
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-surface text-text-secondary"
                          }`}
                        >
                          <Icon className="size-4.5" />
                        </span>
                        <div>
                          <p className="text-xs font-black">{page.title}</p>
                          <p className="text-[10px] font-medium text-text-secondary">
                            تحديث: {formatDate(page.updatedAt)}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-md bg-surface px-1.5 py-0.5 text-[9px] font-bold text-text-secondary">
                        {page.badge}
                      </span>
                    </button>
                  );
                })}
              </CardBody>
            </Card>

            <div className="rounded-2xl border border-border/80 bg-field-bg/40 p-4 text-xs text-text-secondary">
              <div className="flex items-center gap-2 font-bold text-heading">
                <Lock className="size-4 text-primary" />
                <span>حماية وشفافية المنصة</span>
              </div>
              <p className="mt-1.5 leading-relaxed">
                هذه النصوص تظهر مباشرة في تذييل الموقع (Footer) وبداخل صفحة الإعدادات في التطبيق للزبائن والتجار.
              </p>
            </div>
          </div>

          {/* Main Editor: Page Content & Preview (8 cols) */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            <Card className="border border-border/80 shadow-xs">
              <CardHeader
                title={`تعديل: ${selectedPage.title}`}
                action={
                  <span className="ltr-nums text-xs font-bold text-text-secondary">
                    {editorBody.length} حرف
                  </span>
                }
              />
              <CardBody className="space-y-4 p-5">
                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-heading">
                    عنوان الصفحة في المتصفح والتطبيق
                  </label>
                  <input
                    type="text"
                    value={editorTitle}
                    onChange={(e) => setEditorTitle(e.target.value)}
                    className="h-10.5 w-full rounded-xl border border-border bg-field-bg/40 px-3.5 text-sm font-bold text-heading focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-heading">
                    نص ومحتوى الصفحة (الشروط، البنود والسياسات)
                  </label>
                  <textarea
                    rows={12}
                    value={editorBody}
                    onChange={(e) => setEditorBody(e.target.value)}
                    className="w-full rounded-xl border border-border bg-field-bg/40 p-4 text-sm text-heading leading-relaxed font-sans focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-border/60 pt-4">
                  <span className="text-[11px] font-bold text-text-secondary">
                    يتم الحفظ والتطبيق فوراً للمستخدمين
                  </span>

                  <Button onClick={handleSavePage} icon={<Save className="size-4" />}>
                    حفظ نص الصفحة
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 4: مناسبات وحملات التسوق (Occasions & Collections)
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "occasions" && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-base font-black text-heading">
              مناسبات وحملات التسوق الذكية
            </h2>
            <p className="text-xs font-medium text-text-secondary">
              تساعد الزبائن على تصفح وشراء أزياء مخصصة لمناسبات معينة (كالأعراس، الأعياد، العمل، والحفلات).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {occasions.map((occ) => (
              <Card
                key={occ.id}
                className="border border-border/80 bg-surface p-5 shadow-xs transition hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-field-bg text-2xl shadow-2xs">
                      {occ.icon}
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-heading">{occ.name}</h3>
                      <p className="mt-0.5 text-xs text-text-secondary line-clamp-2 leading-relaxed">
                        {occ.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {occ.categories.map((cat, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-field-bg px-2 py-0.5 text-[10px] font-bold text-text-secondary"
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                  <span className="font-bold text-text-secondary">
                    عرض في الهيرو والواجهة:
                  </span>
                  <Toggle
                    checked={occ.isFeaturedOnHome}
                    onChange={() => handleToggleOccasion(occ.id)}
                    label={occ.isFeaturedOnHome ? "معروض" : "مخفي"}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── Modal Dialogs ────────────────────────────────────────── */}

      {/* Add / Edit Banner Dialog */}
      <BannerFormDialog
        banner={bannerForm}
        onSubmit={handleSaveBanner}
        onCancel={() => setBannerForm(null)}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title="حذف هذا البانر الإعلاني؟"
        body="سيتم إزالة البانر نهائياً ولن يظهر في شريط العروض الترويجية."
        confirmLabel="حذف البانر"
        onConfirm={handleDeleteBanner}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
