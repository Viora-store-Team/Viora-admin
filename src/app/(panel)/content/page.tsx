"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Info,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pencil,
  Quote,
  Redo,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Undo,
  HelpCircle,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { formatDate } from "@/lib/format";
import { useFlash } from "@/lib/useFlash";
import { dispatchToast } from "@/lib/toast";
import {
  fetchAdminContentPage,
  saveAdminContentPage,
} from "@/lib/admin/api";
import type { AdminContentKey } from "@/lib/admin/types";

interface PageMeta {
  key: AdminContentKey;
  label: string;
  desc: string;
  defaultTitle: string;
  defaultHtml: string;
}

const PAGE_DEFINITIONS: Record<AdminContentKey, PageMeta> = {
  terms: {
    key: "terms",
    label: "الشروط والأحكام",
    desc: "شروط وضوابط استخدام المنصة وحقوق المعاملات والتسوق",
    defaultTitle: "شروط وأحكام استخدام منصة فيورا (Terms & Conditions)",
    defaultHtml: `<h2>أهلاً بك في فيورا</h2>
<p>تنظّم هذه الشروط استخدام منصة <strong>فيورا (Viora)</strong> من المتسوقين وأصحاب المتاجر. عند إنشاء حساب أو استخدام المنصة، يرجى قراءة البنود التالية والالتزام بها.</p>
<blockquote><strong>عن دور فيورا:</strong> فيورا منصة تجمع المتسوقين بالمتاجر المستقلة وتوفّر أدوات لعرض المنتجات وإدارة الطلبات. المتجر هو المسؤول عن معلومات منتجاته وتجهيز طلباته، وتُعرض تفاصيل الطلب والتوصيل للمتسوق قبل تأكيده.</blockquote>
<h3>الحسابات والاستخدام</h3>
<ul><li>قدّم معلومات صحيحة ومحدّثة، وحافظ على سرية بيانات الدخول ولا تستخدم حساب شخص آخر دون إذنه.</li><li>استخدم المنصة بطريقة مشروعة ومحترمة، ولا ترفع محتوى مضللاً أو مسيئاً أو ينتهك حقوق الآخرين.</li><li>أبلغ فريق الدعم عن أي استخدام غير مصرح به لحسابك أو مشكلة تواجهها أثناء استخدام المنصة.</li></ul>
<h3>المتاجر والمنتجات</h3>
<ul><li>تخضع حسابات المتاجر للمراجعة قبل اعتمادها. ويجب على التاجر تقديم بيانات متجر صحيحة وتحديث معلومات المنتجات والأسعار والمخزون عند تغيّرها.</li><li>قد تختلف المنتجات المتاحة أو تفاصيلها من متجر لآخر. يراجع المتسوق وصف المنتج وخياراته وسعره قبل إرسال الطلب.</li><li>المتاجر المشاركة جهات مستقلة مسؤولة عن منتجاتها ودقة معلوماتها وتجهيز الطلبات التي تقبلها.</li></ul>
<h3>الطلبات والدفع والتوصيل</h3>
<ol><li>إرسال الطلب لا يعني قبوله من المتجر؛ تظهر حالة الطلب في حسابك بعد تحديثها.</li><li>قد تُقسّم السلة إلى طلبات منفصلة بحسب المتاجر، ولكل طلب حالته وتجهيزه وتوصيله.</li><li>طريقة الدفع المتاحة حالياً عند إتمام الطلب هي <strong>الدفع عند الاستلام</strong>. إذا تغيرت الخيارات، ستظهر الطريقة المتاحة في صفحة إتمام الطلب.</li><li>تُحسب رسوم التوصيل وتفاصيله بحسب الطلب وشركة التوصيل، وتُعرض في ملخص الطلب قبل التأكيد.</li></ol>
<h3>الإلغاء والتقييمات</h3>
<p>يمكن طلب إلغاء الطلب من المنصة ما دامت حالته تسمح بذلك، ويظهر الخيار المتاح في صفحة الطلب. إذا لم يعد خيار الإلغاء متاحاً، تواصل مع الدعم للمساعدة. يمكن إضافة تقييم بعد اكتمال الطلب وظهور خيار التقييم، ويجب أن يعبّر التقييم عن تجربة حقيقية.</p>
<h3>حقوق المحتوى والتحديثات</h3>
<p>تعود حقوق المحتوى والعلامات الخاصة بكل طرف إلى أصحابها. لا يجوز نسخها أو استخدامها خارج الغرض المسموح به دون إذن. قد نحدّث هذه الشروط عند تغيير خدمات المنصة؛ ويُنشر النص المحدّث في هذه الصفحة.</p>
<p>للاستفسارات أو الشكاوى المتعلقة بطلب أو حساب، استخدم قنوات الدعم المتاحة داخل المنصة.</p>`,
  },
  privacy: {
    key: "privacy",
    label: "سياسة الخصوصية",
    desc: "حماية بيانات ومعلومات المتسوقين والتجار وسرية الحسابات",
    defaultTitle: "سياسة الخصوصية وحماية بيانات المستخدمين (Privacy Policy)",
    defaultHtml: `<h2>خصوصيتك مهمة لنا</h2>
<p>تشرح هذه السياسة كيف تتعامل <strong>فيورا (Viora)</strong> مع البيانات اللازمة لتشغيل سوق يربط المتسوقين بالمتاجر وإدارة الحسابات والطلبات. تنطبق على المتسوقين وأصحاب المتاجر عند استخدامهم خدمات فيورا.</p>
<h3>ما البيانات التي قد نستخدمها؟</h3>
<ul><li><strong>بيانات الحساب:</strong> الاسم والبريد الإلكتروني ورقم الهاتف ومعلومات الدخول.</li><li><strong>بيانات المتجر:</strong> اسم المتجر وبيانات التواصل والعنوان والتصنيفات والمنتجات التي يضيفها التاجر.</li><li><strong>بيانات الطلب:</strong> المنتجات والكميات والعنوان وبيانات المستلم وحالة الطلب وطريقة الدفع المختارة.</li><li><strong>بيانات التفاعل:</strong> المفضلة والتقييمات والرسائل أو التفاصيل التي يرسلها المستخدم إلى الدعم.</li></ul>
<h3>لماذا نستخدمها؟</h3>
<ul><li>إنشاء الحساب وإدارته والتحقق من بيانات المتجر عند المراجعة.</li><li>عرض المنتجات، إرسال الطلبات إلى المتاجر، متابعة حالتها وتنسيق التوصيل.</li><li>إرسال إشعارات مرتبطة بالحساب أو الطلب، والرد على الاستفسارات ومعالجة البلاغات.</li><li>حماية المنصة، اكتشاف الاستخدام غير المعتاد، وتحسين تجربة الاستخدام.</li></ul>
<h3>متى تُشارك البيانات؟</h3>
<p>تُشارك بيانات الطلب اللازمة مع المتجر المعني لتجهيزه، ومع شركة التوصيل بالقدر اللازم لتسليمه. وقد تتم معالجتها عبر مزودي خدمات يساعدون في تشغيل المنصة، وفق ما يلزم لتقديم الخدمة. لا نبيع بياناتك الشخصية.</p>
<blockquote><strong>اختاري ما تشاركينه:</strong> لا تضيفي في ملاحظات الطلب أو رسائل الدعم معلومات شخصية لا يحتاجها تنفيذ الطلب أو معالجة طلبك.</blockquote>
<h3>الحماية والاحتفاظ</h3>
<p>نستخدم إجراءات تنظيمية وتقنية مناسبة للمساعدة في حماية البيانات، ونحتفظ بها للمدة اللازمة لتشغيل الحساب والطلبات والدعم والوفاء بالالتزامات ذات الصلة. لا توجد وسيلة نقل أو تخزين إلكترونية مضمونة بالكامل، لذلك نحدّ من الوصول إلى البيانات بحسب الحاجة للعمل.</p>
<h3>خياراتك وحقوقك</h3>
<p>يمكنك مراجعة بيانات حسابك وتحديث ما تسمح به إعدادات المنصة. لطلب تصحيح بيانات أو الاستفسار عن استخدامها أو طلب إغلاق الحساب، تواصل مع الدعم من خلال القنوات المتاحة داخل المنصة. قد نحتاج إلى الاحتفاظ ببعض سجلات الطلبات للمتابعة أو الالتزامات النظامية.</p>
<p>قد نحدّث هذه السياسة عند إضافة خدمات أو تغيير طريقة تشغيلها. سننشر النسخة المحدثة هنا مع تاريخ تحديثها.</p>`,
  },
  about: {
    key: "about",
    label: "من نحن",
    desc: "تعريف بمنصة فيورا ورسالتها وقيمها للمتسوق والتاجر",
    defaultTitle: "عن منصة فيورا (About Viora)",
    defaultHtml: `<h2>فيورا تجمع المتسوقين بالمتاجر المحلية</h2>
<p><strong>فيورا (Viora)</strong> منصة تسوّق إلكتروني تساعدك على اكتشاف منتجات متاجر متعددة وطلبها من مكان واحد، وتمنح أصحاب المتاجر مساحة لعرض منتجاتهم ومتابعة طلباتهم.</p>
<h3>كيف تعمل فيورا؟</h3>
<ul><li><strong>للمتسوق:</strong> استعرض المنتجات والمتاجر، اختر التفاصيل المتاحة، أضف ما تريد إلى السلة، ثم أكمل الطلب وتابع حالته من حسابك.</li><li><strong>لصاحب المتجر:</strong> أنشئ ملف متجرك، أضف المنتجات والأسعار والمخزون، وتابع الطلبات التي تصل إلى متجرك من لوحة التاجر.</li><li><strong>للطلبات:</strong> يتولى كل متجر تجهيز طلبه، لذلك قد تظهر طلبات منفصلة عند الشراء من أكثر من متجر.</li></ul>
<h3>ما الذي نؤمن به؟</h3>
<p>نؤمن أن تجربة التسوق الأفضل تبدأ بمعلومات واضحة، وخيارات سهلة، وتواصل محترم بين المتسوق والمتجر. لذلك نعمل على جعل استعراض المنتجات وإدارة الطلبات أكثر سهولة ووضوحاً للطرفين.</p>
<blockquote><strong>فيورا مساحة مشتركة:</strong> المتاجر المستقلة تعرض منتجاتها وتدير تجهيزها، والمتسوق يختار ما يناسبه ويتابع طلبه من المنصة.</blockquote>
<h3>نعمل على تطوير التجربة</h3>
<p>نطوّر أدوات المنصة باستمرار لتسهيل اكتشاف المنتجات وإدارة المتاجر ومتابعة الطلبات. إذا واجهتك مشكلة أو كان لديك اقتراح، يسعدنا أن تتواصل معنا عبر قنوات الدعم المتاحة داخل فيورا.</p>`,
  },
  faq: {
    key: "faq",
    label: "الأسئلة الشائعة",
    desc: "دليل إجابات وتوضيحات عن الشراء والشحن والتقييم والإلغاء",
    defaultTitle: "الأسئلة الشائعة حول منصة فيورا (FAQ)",
    defaultHtml: `<h2>إجابات سريعة عن التسوق في فيورا</h2>
<h3>كيف أطلب منتجاً؟</h3><p>افتح صفحة المنتج، اختر الخيارات المتاحة مثل اللون أو المقاس، أضفه إلى السلة، ثم راجع السلة وأكمل الطلب بإدخال عنوان التوصيل.</p>
<h3>لماذا أصبح طلبي أكثر من طلب؟</h3><p>إذا كانت السلة تضم منتجات من متاجر مختلفة، ينشئ النظام طلباً لكل متجر. يتابع كل متجر طلبه على حدة، لذلك قد تختلف حالة أو موعد وصول كل جزء.</p>
<h3>ما طريقة الدفع المتاحة؟</h3><p>طريقة الدفع المتاحة حالياً عند إتمام الطلب هي <strong>الدفع عند الاستلام</strong>. تظهر تفاصيل المبلغ ورسوم التوصيل في ملخص الطلب قبل التأكيد.</p>
<h3>كيف تُحسب رسوم التوصيل؟</h3><p>تُحدد رسوم التوصيل بحسب الطلب وشركة التوصيل، وتظهر في ملخص الدفع قبل إرسال الطلب.</p>
<h3>كيف أتابع حالة طلبي؟</h3><p>من صفحة <strong>طلباتي</strong> في حسابك يمكنك فتح الطلب ومراجعة حالته وتفاصيله. وقد يكون لكل متجر ضمن السلة حالة مستقلة.</p>
<h3>هل يمكنني إلغاء الطلب؟</h3><p>يعرض النظام خيار الإلغاء عندما تسمح حالة الطلب بذلك، ويطلب اختيار سبب الإلغاء. إذا لم يظهر الخيار، تواصل مع الدعم من خلال القنوات المتاحة في المنصة.</p>
<h3>متى أستطيع إضافة تقييم؟</h3><p>يظهر خيار التقييم بعد اكتمال الطلب وتحديث حالته إلى <strong>تم التوصيل</strong>. يمكنك تقييم المنتج وكتابة رأيك عن تجربتك.</p>
<h3>كيف أتواصل مع المتجر؟</h3><p>راجع معلومات التواصل الظاهرة في صفحة المتجر. وللمساعدة المتعلقة بحسابك أو طلبك، استخدم قنوات الدعم داخل المنصة.</p>
<h3>كيف أفتح متجراً على فيورا؟</h3><p>أنشئ حساب تاجر، وأكمل معلومات الحساب والمتجر المطلوبة، ثم أرسل طلبك للمراجعة. ستتمكن من متابعة حالة المتجر من لوحة التاجر.</p>
<h3>كيف أعدّل بياناتي أو عنوان التوصيل؟</h3><p>يمكنك إدارة بيانات حسابك وعناوينك من صفحات الحساب المخصصة. تأكد من مراجعة عنوان ورقم هاتف المستلم قبل تأكيد كل طلب.</p>
<h3>لم أجد إجابة سؤالي، ماذا أفعل؟</h3><p>تواصل مع الدعم عبر القنوات المتاحة داخل فيورا، واذكر رقم الطلب إن كان سؤالك متعلقاً بعملية شراء.</p>`,
  },
};

interface LocalPageState {
  title: string;
  html: string;
  isPublished: boolean;
  updatedAt: string | null;
}

export default function AdminContentPage() {
  const [activeKey, setActiveKey] = useState<AdminContentKey>("terms");
  const [activeView, setActiveView] = useState<"edit" | "preview">("edit");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, showFlash] = useFlash();
  const [errors, setErrors] = useState<Partial<Record<AdminContentKey, string>>>({});
  const [loaded, setLoaded] = useState<AdminContentKey[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [dirtyKeys, setDirtyKeys] = useState<AdminContentKey[]>([]);
  const activeKeyRef = useRef<AdminContentKey>("terms");
  const loadedKeysRef = useRef<AdminContentKey[]>([]);
  const markDirty = () => setDirtyKeys(keys => keys.includes(activeKeyRef.current) ? keys : [...keys, activeKeyRef.current]);
  const canEdit = !saving && !loading && loaded.includes(activeKey);
  useEffect(() => {
    if (!dirtyKeys.length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href]");
      if (link && !window.confirm("لديك تعديلات غير محفوظة. هل تريد مغادرة الصفحة؟")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", navigate, true); };
  }, [dirtyKeys]);

  // In-memory cache for all 4 pages
  const [pagesState, setPagesState] = useState<Record<AdminContentKey, LocalPageState>>({
    terms: {
      title: PAGE_DEFINITIONS.terms.defaultTitle,
      html: "",
      isPublished: false,
      updatedAt: null,
    },
    privacy: {
      title: PAGE_DEFINITIONS.privacy.defaultTitle,
      html: "",
      isPublished: false,
      updatedAt: null,
    },
    about: {
      title: PAGE_DEFINITIONS.about.defaultTitle,
      html: "",
      isPublished: false,
      updatedAt: null,
    },
    faq: {
      title: PAGE_DEFINITIONS.faq.defaultTitle,
      html: "",
      isPublished: false,
      updatedAt: null,
    },
  });

  // Active Toolbar States
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    justifyRight: false,
    justifyCenter: false,
    justifyLeft: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });

  // Stats
  const [wordCount, setWordCount] = useState(0);

  const editorRef = useRef<HTMLDivElement>(null);

  const cleanPageHtml = (rawHtml: string): string => sanitizeHtml(rawHtml || "");

  const updateStats = (htmlText: string) => {
    const text = htmlText.replace(/<[^>]*>/g, " ").trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    setWordCount(words);
  };

  const checkActiveFormats = () => {
    if (typeof document === "undefined") return;
    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        justifyRight: document.queryCommandState("justifyRight"),
        justifyCenter: document.queryCommandState("justifyCenter"),
        justifyLeft: document.queryCommandState("justifyLeft"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let active = true;
    const keys = (["terms", "privacy", "about", "faq"] as AdminContentKey[]).filter(key => !loadedKeysRef.current.includes(key));
    void Promise.all(keys.map(async key => ({ key, res: await fetchAdminContentPage(key) }))).then(results => {
      if (!active) return;
      const next: Partial<Record<AdminContentKey, LocalPageState>> = {};
      const failures: Partial<Record<AdminContentKey, string>> = {};
      const ready: AdminContentKey[] = [];
      for (const {key, res} of results) {
        if (res.success && res.page && typeof res.page.html === "string") {
          next[key] = { title: res.page.title, html: sanitizeHtml(res.page.html), isPublished: res.page.isPublished, updatedAt: res.page.updatedAt };
          ready.push(key);
        } else failures[key] = res.message || "تعذر تحميل هذه الصفحة. أعد المحاولة قبل التعديل أو النشر.";
      }
      setPagesState(prev => ({...prev, ...next}));
      loadedKeysRef.current = [...new Set([...loadedKeysRef.current, ...ready])];
      setLoaded(loadedKeysRef.current);
      setErrors(prev => ({...prev, ...Object.fromEntries(ready.map(key => [key, ""])), ...failures}));
      const selected = next[activeKeyRef.current];
      if (selected) {
        if (editorRef.current) editorRef.current.innerHTML = selected.html;
        updateStats(selected.html);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [attempt]);

  // Handle switching between pages (terms / privacy / about / faq)
  const handleSelectPage = (newKey: AdminContentKey) => {
    if (newKey === activeKey) return;

    // 1. Save current editor state into pagesState for the previous page
    let currentHtml = pagesState[activeKey]?.html || "";
    if (editorRef.current) {
      currentHtml = editorRef.current.innerHTML;
    }

    const nextPages = {
      ...pagesState,
      [activeKey]: {
        ...pagesState[activeKey],
        html: currentHtml,
      },
    };

    setPagesState(nextPages);
    activeKeyRef.current = newKey;
    setActiveKey(newKey);

    // 2. Put target page's content into editor immediately
    const targetHtml = nextPages[newKey]?.html || "";
    if (editorRef.current) {
      editorRef.current.innerHTML = targetHtml;
      updateStats(targetHtml);
    }
  };

  // Switch between Edit and Preview modes
  const handleSwitchView = (view: "edit" | "preview") => {
    if (view === "preview" && editorRef.current) {
      const current = editorRef.current.innerHTML;
      const cleaned = cleanPageHtml(current);
      setPagesState((prev) => ({
        ...prev,
        [activeKey]: {
          ...prev[activeKey],
          html: cleaned,
        },
      }));
    } else if (view === "edit" && editorRef.current) {
      const htmlToRestore = pagesState[activeKey].html;
      editorRef.current.innerHTML = htmlToRestore;
      updateStats(htmlToRestore);
    }
    setActiveView(view);
  };

  // Editor formatting command runner
  const execFormat = (cmd: string, val: string | undefined = undefined) => {
    if (typeof document === "undefined") return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    if (!canEdit) return;
    document.execCommand(cmd, false, val);
    markDirty();
    checkActiveFormats();
    if (editorRef.current) {
      updateStats(editorRef.current.innerHTML);
    }
  };

  // Insert whitelist-compliant HTML blocks
  const insertCustomBlock = (type: "h2" | "h3" | "quote" | "hr" | "callout" | "qa") => {
    if (!canEdit || typeof document === "undefined" || !editorRef.current) return;
    editorRef.current.focus();

    let snippet = "";
    if (type === "h2") {
      snippet = "<h2>عنوان بند رئيسي جديد</h2><p>اكتب التفاصيل هنا...</p>";
    } else if (type === "h3") {
      snippet = "<h3>عنوان فرعي للفقرة</h3><p>محتوى البند...</p>";
    } else if (type === "quote") {
      snippet = "<blockquote>اقتباس أو نص هام يتم إبرازه هنا...</blockquote><p></p>";
    } else if (type === "hr") {
      snippet = "<hr/><p></p>";
    } else if (type === "callout") {
      snippet = `<blockquote><strong>تنبيه هام:</strong> اكتب الملاحظة هنا...</blockquote><p></p>`;
    } else if (type === "qa") {
      snippet = `<h3>سؤال جديد يهم المتسوقين والعملاء؟</h3><p>اكتب الإجابة والشرح الوافي والتفصيلي هنا...</p>`;
    }

    document.execCommand("insertHTML", false, snippet);
    markDirty();
    checkActiveFormats();
    if (editorRef.current) {
      updateStats(editorRef.current.innerHTML);
    }
  };

  // Insert link (compliant with backend target=_blank rel=noopener)
  const handleInsertLink = () => {
    if (!canEdit || !editorRef.current) return;
    editorRef.current.focus();
    const url = prompt("أدخل رابط الموقع (URL):", "https://");
    if (url && /^https?:\/\/\S+$/i.test(url.trim()) && url !== "https://") {
      execFormat("createLink", url.trim());
    }
  };

  // Save changes to backend
  const handleSave = async () => {
    if (!canEdit) return;
    const savedKey = activeKey;
    setErrors(prev => ({...prev, [savedKey]: ""}));
    setSaving(true);
    const currentPage = pagesState[activeKey];
    const rawHtml = editorRef.current ? editorRef.current.innerHTML : currentPage.html;
    const htmlToSave = cleanPageHtml(rawHtml);

    if (!htmlToSave.replace(/<[^>]*>/g, "").trim()) {
      setErrors(prev => ({...prev, [savedKey]: "المحتوى لا يمكن أن يكون فارغاً"}));
      dispatchToast("warning", "أضيفي محتوى للصفحة قبل حفظها.");
      setSaving(false);
      return;
    }

    try {
      const res = await saveAdminContentPage(activeKey, {
        title: currentPage.title.trim() || PAGE_DEFINITIONS[activeKey].defaultTitle,
        html: htmlToSave,
      });

      if (res.success && res.page) {
        // Rule 1: The backend sanitizes HTML upon write.
        // The frontend editor state MUST update with res.page.html immediately!
        const serverSanitizedHtml = sanitizeHtml(res.page.html);
        const serverUpdatedAt = res.page.updatedAt || new Date().toISOString();

        setPagesState((prev) => ({
          ...prev,
          [activeKey]: {
            ...prev[activeKey],
            title: res.page!.title,
            html: serverSanitizedHtml,
            isPublished: res.page!.isPublished,
            updatedAt: serverUpdatedAt,
          },
        }));

        setDirtyKeys(keys => keys.filter(key => key !== savedKey));
        if (editorRef.current && activeKeyRef.current === savedKey) {
          editorRef.current.innerHTML = serverSanitizedHtml;
          updateStats(serverSanitizedHtml);
        }

        showFlash(
          typeof res.message === "string" ? res.message : "تم حفظ الصفحة بنجاح",
        );
      } else {
        const message = Object.values(res.errors || {}).join(" · ") || res.message || "تعذر حفظ الصفحة";
        setErrors(prev => ({...prev, [savedKey]: message}));
        dispatchToast("error", message);
      }
    } catch {
      setErrors(prev => ({...prev, [savedKey]: "تعذر حفظ الصفحة، يرجى المحاولة لاحقاً"}));
      dispatchToast("error", "تعذر حفظ الصفحة، يرجى المحاولة لاحقاً.");
    } finally {
      setSaving(false);
    }
  };

  // Reset current page to official template
  const handleReset = () => {
    if (!canEdit) return;
    const meta = PAGE_DEFINITIONS[activeKey];
    if (confirm(`هل ترغب بإعادة تعيين صفحة "${meta.label}" إلى النموذج الرسمي المعتمد؟`)) {
      markDirty();
      setPagesState((prev) => ({
        ...prev,
        [activeKey]: {
          ...prev[activeKey],
          title: meta.defaultTitle,
          html: meta.defaultHtml,
        },
      }));

      if (editorRef.current) {
        editorRef.current.innerHTML = meta.defaultHtml;
        updateStats(meta.defaultHtml);
      }
      showFlash(`تمت استعادة النموذج المعتمد لصفحة "${meta.label}" بنجاح ✨`);
    }
  };

  const currentPage = pagesState[activeKey];
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 180));

  return (
    <div className="flex flex-col gap-6">
      {/* 🌟 Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-heading">
              إدارة محتوى وصفحات المنصة
            </h1>
            <span className="flex items-center gap-1 rounded-full border border-success/20 bg-success-soft px-2.5 py-0.5 text-[11px] font-extrabold text-success">
              <ShieldCheck className="size-3.5" />
              مربوط بالباك إند الحقيقي
            </span>
          </div>
          <p className="mt-1 text-xs font-bold text-text-secondary">
            تحرير وتنسيق الصفحات الثابتة والسياسات (الشروط والأحكام · الخصوصية · من نحن) المعروضة للزبائن والتجار.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={handleReset}
            disabled={!canEdit}
            icon={<RotateCcw className="size-4" />}
          >
            استعادة الافتراضي
          </Button>

          <Button
            onClick={handleSave}
            disabled={!canEdit}
            icon={<Save className="size-4" />}
          >
            {saving ? "جاري الحفظ والنشر..." : "حفظ ونشر الصفحة"}
          </Button>
        </div>
      </div>

      <ErrorBanner message={errors[activeKey]} onRetry={!loaded.includes(activeKey) ? () => { setLoading(true); setAttempt(n => n + 1); } : undefined} />
      {dirtyKeys.length > 0 && <p role="status" className="text-sm text-warning">لديك تعديلات غير محفوظة في {dirtyKeys.length} صفحة.</p>}
      {flash && (
        <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm font-extrabold text-success shadow-xs">
          <CheckCircle2 className="size-4.5 shrink-0" />
          <span>{flash}</span>
        </div>
      )}

      {/* 📑 Page Switcher Tabs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(PAGE_DEFINITIONS) as AdminContentKey[]).map((key) => {
          const item = PAGE_DEFINITIONS[key];
          const pageData = pagesState[key];
          const isSelected = activeKey === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectPage(key)}
              className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-right transition cursor-pointer shadow-xs ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/15"
                  : "border-border/80 bg-surface hover:border-primary/40 hover:bg-field-bg/50"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`grid size-8 place-items-center rounded-xl ${
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-primary-soft text-primary"
                    }`}
                  >
                    {key === "terms" && <FileText className="size-4" />}
                    {key === "privacy" && <ShieldCheck className="size-4" />}
                    {key === "about" && <Info className="size-4" />}
                    {key === "faq" && <HelpCircle className="size-4" />}
                  </span>
                  <span className="text-sm font-black text-heading">
                    {item.label}
                  </span>
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    pageData.isPublished
                      ? "bg-success-soft text-success border border-success/20"
                      : "bg-field-bg text-text-secondary border border-border"
                  }`}
                >
                  {!loaded.includes(key) ? "غير محمّلة" : pageData.isPublished ? "منشورة" : "مسودة"}
                </span>
              </div>

              <p className="text-[11px] font-bold text-text-secondary line-clamp-1">
                {item.desc}
              </p>

              <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-text-secondary">
                <Clock className="size-3" />
                <span>
                  {pageData.updatedAt
                    ? `آخر تحديث: ${formatDate(pageData.updatedAt)}`
                    : loaded.includes(key) ? "جاهزة للتعديل" : "بانتظار التحميل"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 📊 Metrics for currently selected page */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border border-border/80 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <FileText className="size-5" />
            </span>
            <div>
              <p className="text-[11px] font-bold text-text-secondary">إجمالي الكلمات</p>
              <p className="ltr-nums text-lg font-black text-heading">{wordCount} كلمة</p>
            </div>
          </div>
        </Card>

        <Card className="border border-border/80 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-info-soft text-info">
              <Clock className="size-5" />
            </span>
            <div>
              <p className="text-[11px] font-bold text-text-secondary">وقت القراءة المقدر</p>
              <p className="ltr-nums text-lg font-black text-heading">~{readingTimeMin} دقائق</p>
            </div>
          </div>
        </Card>

        <Card className="border border-border/80 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-success-soft text-success">
              <FileCheck className="size-5" />
            </span>
            <div>
              <p className="text-[11px] font-bold text-text-secondary">حالة النشر الرسمية</p>
              <p className="text-xs font-bold text-heading mt-0.5">
                {currentPage.isPublished ? "منشورة ومتاحة للعامة" : "مسودة غير منشورة"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 📋 Main Editor Card */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        {/* Top Control Bar */}
        <div className="border-b border-border/70 bg-field-bg/30 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Title Input */}
            <div className="flex-1">
              <label className="mb-1 block text-xs font-extrabold text-heading">
                عنوان الصفحة ({PAGE_DEFINITIONS[activeKey].label})
              </label>
              <input
                type="text"
                value={currentPage.title}
                disabled={!canEdit}
                aria-label="عنوان الصفحة"
                onChange={(e) => {
                  const val = e.target.value;
                  markDirty();
                  setPagesState((prev) => ({
                    ...prev,
                    [activeKey]: {
                      ...prev[activeKey],
                      title: val,
                    },
                  }));
                }}
                placeholder="أدخل عنوان الصفحة..."
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-black text-heading focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/15"
              />
            </div>

            {/* View Mode Toggle: Edit Mode vs Clean Customer Preview */}
            <div className="flex items-end">
              <div className="flex items-center rounded-xl border border-border bg-surface p-1">
                <button
                  type="button"
                  onClick={() => handleSwitchView("edit")}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                    activeView === "edit"
                      ? "bg-primary text-white shadow-2xs"
                      : "text-text-secondary hover:text-heading"
                  }`}
                >
                  <Pencil className="size-3.5" />
                  محرر النص
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchView("preview")}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                    activeView === "preview"
                      ? "bg-primary text-white shadow-2xs"
                      : "text-text-secondary hover:text-heading"
                  }`}
                >
                  <Eye className="size-3.5" />
                  معاينة كعميل
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            Rich Text Toolbar (Whitelisted elements strictly matching backend)
        ══════════════════════════════════════════════════════════════ */}
        {activeView === "edit" && (
          <div className="flex flex-wrap items-center gap-1 border-b border-border/70 bg-surface px-3 py-2 text-xs select-none">
            {/* Headings: h2 and h3 */}
            <div className="flex items-center gap-0.5 border-l border-border/70 pl-2">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertCustomBlock("h2");
                }}
                title="عنوان رئيسي (H2)"
                className="grid size-7.5 place-items-center rounded-lg hover:bg-field-bg text-heading font-black text-xs transition cursor-pointer"
              >
                H2
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertCustomBlock("h3");
                }}
                title="عنوان فرعي (H3)"
                className="grid size-7.5 place-items-center rounded-lg hover:bg-field-bg text-heading font-bold text-xs transition cursor-pointer"
              >
                H3
              </button>
            </div>

            {/* Basic Text Formatting (Bold, Italic) */}
            <div className="flex items-center gap-0.5 border-l border-border/70 pl-2">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execFormat("bold");
                }}
                title="عريض (Bold)"
                className={`grid size-7.5 place-items-center rounded-lg transition cursor-pointer ${
                  activeFormats.bold
                    ? "bg-primary text-white shadow-2xs"
                    : "hover:bg-field-bg text-heading"
                }`}
              >
                <Bold className="size-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execFormat("italic");
                }}
                title="مائل (Italic)"
                className={`grid size-7.5 place-items-center rounded-lg transition cursor-pointer ${
                  activeFormats.italic
                    ? "bg-primary text-white shadow-2xs"
                    : "hover:bg-field-bg text-heading"
                }`}
              >
                <Italic className="size-3.5" />
              </button>
            </div>

            {/* Text Alignment */}
            <div className="flex items-center gap-0.5 border-l border-border/70 pl-2">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execFormat("justifyRight");
                }}
                title="محاذاة لليمين"
                className={`grid size-7.5 place-items-center rounded-lg transition cursor-pointer ${
                  activeFormats.justifyRight
                    ? "bg-primary text-white shadow-2xs"
                    : "hover:bg-field-bg text-heading"
                }`}
              >
                <AlignRight className="size-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execFormat("justifyCenter");
                }}
                title="توسيط"
                className={`grid size-7.5 place-items-center rounded-lg transition cursor-pointer ${
                  activeFormats.justifyCenter
                    ? "bg-primary text-white shadow-2xs"
                    : "hover:bg-field-bg text-heading"
                }`}
              >
                <AlignCenter className="size-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execFormat("justifyLeft");
                }}
                title="محاذاة لليسار"
                className={`grid size-7.5 place-items-center rounded-lg transition cursor-pointer ${
                  activeFormats.justifyLeft
                    ? "bg-primary text-white shadow-2xs"
                    : "hover:bg-field-bg text-heading"
                }`}
              >
                <AlignLeft className="size-3.5" />
              </button>
            </div>

            {/* Lists: ul, ol */}
            <div className="flex items-center gap-0.5 border-l border-border/70 pl-2">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execFormat("insertUnorderedList");
                }}
                title="قائمة نقطية"
                className={`grid size-7.5 place-items-center rounded-lg transition cursor-pointer ${
                  activeFormats.insertUnorderedList
                    ? "bg-primary text-white shadow-2xs"
                    : "hover:bg-field-bg text-heading"
                }`}
              >
                <List className="size-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execFormat("insertOrderedList");
                }}
                title="قائمة مرقمة"
                className={`grid size-7.5 place-items-center rounded-lg transition cursor-pointer ${
                  activeFormats.insertOrderedList
                    ? "bg-primary text-white shadow-2xs"
                    : "hover:bg-field-bg text-heading"
                }`}
              >
                <ListOrdered className="size-3.5" />
              </button>
            </div>

            {/* Blockquote, Callout, HR, Link */}
            <div className="flex items-center gap-0.5 border-l border-border/70 pl-2">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertCustomBlock("quote");
                }}
                title="اقتباس"
                className="grid size-7.5 place-items-center rounded-lg hover:bg-field-bg text-heading transition cursor-pointer"
              >
                <Quote className="size-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertCustomBlock("callout");
                }}
                title="صندوق تنبيه وملاحظة هامة"
                className="flex items-center gap-1 px-2.5 h-7.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition cursor-pointer"
              >
                <Sparkles className="size-3.5" />
                <span>ملاحظة هامة</span>
              </button>
              {activeKey === "faq" && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertCustomBlock("qa");
                  }}
                  title="إدراج سؤال وجواب جديد"
                  className="flex items-center gap-1 px-2.5 h-7.5 rounded-lg bg-success-soft hover:bg-success/20 text-success font-extrabold text-xs transition cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>+ سؤال وجواب</span>
                </button>
              )}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertCustomBlock("hr");
                }}
                title="خط فاصل"
                className="grid size-7.5 place-items-center rounded-lg hover:bg-field-bg text-heading transition cursor-pointer"
              >
                <Minus className="size-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleInsertLink();
                }}
                title="إدراج رابط"
                className="grid size-7.5 place-items-center rounded-lg hover:bg-field-bg text-heading transition cursor-pointer"
              >
                <Link2 className="size-3.5" />
              </button>
            </div>

            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 mr-auto">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execFormat("undo");
                }}
                title="تراجع (Ctrl+Z)"
                className="grid size-7.5 place-items-center rounded-lg hover:bg-field-bg text-heading transition active:scale-95 cursor-pointer"
              >
                <Undo className="size-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execFormat("redo");
                }}
                title="إعادة (Ctrl+Y)"
                className="grid size-7.5 place-items-center rounded-lg hover:bg-field-bg text-heading transition active:scale-95 cursor-pointer"
              >
                <Redo className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            Editable Canvas (Active when activeView === 'edit')
        ══════════════════════════════════════════════════════════════ */}
        <div
          key="editor-canvas-container"
          className={activeView === "edit" ? "bg-app-bg/50 p-6 min-h-[500px]" : "hidden"}
        >
          <div
            ref={editorRef}
            contentEditable={canEdit}
            onDrop={(event) => event.preventDefault()}
            role="textbox"
            aria-label="محتوى الصفحة"
            aria-multiline="true"
            onPaste={(event) => {
              event.preventDefault();
              if (!canEdit) return;
              const text = document.createElement("div");
              text.textContent = event.clipboardData.getData("text/plain");
              document.execCommand("insertHTML", false, sanitizeHtml(event.clipboardData.getData("text/html") || text.innerHTML));
              markDirty();
            }}
            suppressContentEditableWarning
            onInput={() => {
              markDirty();
              if (editorRef.current) {
                updateStats(editorRef.current.innerHTML);
              }
            }}
            onKeyUp={checkActiveFormats}
            onMouseUp={checkActiveFormats}
            className="min-h-[460px] w-full rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 text-sm text-heading shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 leading-relaxed font-sans prose prose-neutral max-w-none [&_h2]:text-lg [&_h2]:font-black [&_h2]:text-primary [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-black [&_h3]:text-heading [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:pr-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pr-5 [&_ol]:mb-3 [&_blockquote]:border-r-4 [&_blockquote]:border-primary/60 [&_blockquote]:bg-field-bg/60 [&_blockquote]:p-3 [&_blockquote]:rounded-lg [&_blockquote]:my-3 [&_hr]:my-4 [&_hr]:border-border cursor-text"
            dir="rtl"
          />
        </div>

        {/* ══════════════════════════════════════════════════════════════
            Customer Live Preview Canvas (Active when activeView === 'preview')
            Clean single view with zero duplication!
        ══════════════════════════════════════════════════════════════ */}
        <div
          key="preview-canvas-container"
          className={activeView === "preview" ? "bg-app-bg/50 p-6 min-h-[500px]" : "hidden"}
        >
          <div className="w-full rounded-2xl border border-border/80 bg-surface p-6 sm:p-10 shadow-xs">
            {/* Document Header Letterhead */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-primary tracking-wide">VIORA</span>
                <span className="text-xs text-text-secondary">
                  · وثيقة {PAGE_DEFINITIONS[activeKey].label} الرسمية
                </span>
              </div>
              <span className="rounded-full bg-field-bg px-3 py-1 text-xs font-bold text-text-secondary">
                {currentPage.updatedAt
                  ? `تاريخ النشر: ${formatDate(currentPage.updatedAt)}`
                  : "نسخة معتمدة"}
              </span>
            </div>

            <h1 className="text-2xl font-black text-heading mb-6 leading-tight">
              {currentPage.title}
            </h1>

            {/* Single Clean Rendered Content */}
            <div
              dangerouslySetInnerHTML={{
                __html: cleanPageHtml(currentPage.html),
              }}
              className="text-sm text-heading leading-relaxed font-sans prose prose-neutral max-w-none [&_h2]:text-lg [&_h2]:font-black [&_h2]:text-primary [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-black [&_h3]:text-heading [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:pr-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pr-5 [&_ol]:mb-3 [&_blockquote]:border-r-4 [&_blockquote]:border-primary/60 [&_blockquote]:bg-field-bg/60 [&_blockquote]:p-3 [&_blockquote]:rounded-lg [&_blockquote]:my-3 [&_hr]:my-4 [&_hr]:border-border"
              dir="rtl"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/70 bg-surface p-4">
          <span className="text-xs font-bold text-text-secondary">
            يتم حفظ ونشر التعديلات فورياً في قاعدة البيانات وعلى واجهات المتجر والتطبيق
          </span>

          <Button
            onClick={handleSave}
            disabled={!canEdit}
            icon={<Save className="size-4" />}
          >
            {saving ? "جاري الحفظ..." : "حفظ ونشر التعديلات"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
