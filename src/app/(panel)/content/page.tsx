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
    defaultHtml: `<h2>مرحباً بك في منصة فيورا (Viora)</h2>
<p>يُرجى قراءة شروط وأحكام الاستخدام بعناية قبل استخدام موقعنا وتطبيقاتنا الإلكترونية. باستخدامك للمنصة، فإنك توافق على الالتزام الكامل بهذه الشروط والضوابط المنظمة لعمليات التسوق والتجارة الإلكترونية.</p>

<hr/>

<h3>١. أهلية الاستخدام والحسابات</h3>
<ul>
  <li>باستخدامك للمنصة، تقر بأنك تبلغ من العمر <strong>18 عاماً على الأقل</strong>، أو تستخدم المنصة تحت إشراف ولي الأمر القانوني.</li>
  <li>يلتزم المستخدم بتقديم بيانات صحيحة ودقيقة وكاملة أثناء التسجيل، ويتحمل المسؤولية الكاملة عن الحفاظ على سرية حسابه وكلمة المرور.</li>
</ul>

<blockquote><strong>تنبيه هام:</strong> تحتفظ إدارة فيورا بالحق الكامل في إيقاف أو حظر أي حساب يتبين تقديمه لمعلومات غير صحيحة أو ارتكابه لأي نشاط مخالف للقوانين والأنظمة المعمول بها.</blockquote>

<h3>٢. الطلبات والشراء والشحن والتوصيل</h3>
<ol>
  <li>تخضع جميع عمليات الشراء لتوفر المنتج الفعلي لدى المتجر وتأكيد الطلب.</li>
  <li>تلتزم منصة فيورا ومتاجرها بتوصيل المنتجات وفق المواعيد المحددة عبر شركاء التوصيل المعتمدين لكافة المحافظات.</li>
  <li>يتم توضيح رسوم الشحن والضرائب التقديرية في ملخص الفاتورة قبل إتمام عملية الدفع.</li>
</ol>

<h3>٣. سياسة الأسعار والدفع</h3>
<p>جميع الأسعار المعروضة في المنصة موضحة بالشيكل (₪) وتشمل التفاصيل المعلنة. نوفر خيارات دفع إلكتروني آمنة بالإضافة إلى خيار الدفع عند الاستلام للطلبات المؤهلة.</p>

<h3>٤. حقوق الملكية الفكرية</h3>
<p>جميع العلامات التجارية، الشعارات، التصاميم، النصوص، والبرمجيات المنشورة على منصة <strong>فيورا</strong> هي ملكية حصرية للمنصة، ولا يجوز نسخها أو إعادة استخدامها تجارياً دون موافقة خطية مسبقة.</p>`,
  },
  privacy: {
    key: "privacy",
    label: "سياسة الخصوصية",
    desc: "حماية بيانات ومعلومات المتسوقين والتجار وسرية الحسابات",
    defaultTitle: "سياسة الخصوصية وحماية بيانات المستخدمين (Privacy Policy)",
    defaultHtml: `<h2>سياسة الخصوصية وحماية بيانات المستخدمين</h2>
<p>نحن في منصة <strong>فيورا (Viora)</strong> نولي أهمية قصوى لخصوصية وسرية بيانات مستخدمينا الكرام، سواء كانوا متسوقين أو أصحاب متاجر. توضح هذه الوثيقة كيفية جمع البيانات واستخدامها وحمايتها عند استخدام موقعنا وتطبيقاتنا.</p>

<hr/>

<h3>١. المعلومات التي نقوم بجمعها</h3>
<ul>
  <li><strong>بيانات الحساب:</strong> الاسم، عنوان البريد الإلكتروني، رقم الهاتف، وكلمة المرور المشفرة.</li>
  <li><strong>بيانات التوصيل والشحن:</strong> العنوان الفعلي للمستلم، المدينة، وأي ملاحظات خاصة بالتوصيل لضمان وصول الطلب بدقة.</li>
  <li><strong>بيانات المعاملات:</strong> سجل الطلبات السابقة، المنتجات المفضلة، وسجل عمليات الشراء (دون تخزين أي أرقام بطاقات بنكية حساسة).</li>
</ul>

<blockquote><strong>تأكيد الأمان:</strong> لا نقوم ببيع أو تأجير أو مشاركة بياناتك الشخصية مع أي أطراف ثالثة لأغراض تسويقية أو دعائية تحت أي ظرف.</blockquote>

<h3>٢. كيف نستخدم معلوماتك</h3>
<ol>
  <li>معالجة وتأكيد طلبات الشراء وتنسيق عمليات الشحن والتوصيل مع المتاجر وشركاء التوصيل.</li>
  <li>إرسال التنبيهات وإشعارات حالة الطلب عبر الرسائل النصية والبريد الإلكتروني.</li>
  <li>تحسين جودة المنصة وتخصيص تجربة التسوق وتقديم الدعم الفني الفوري للعملاء.</li>
</ol>

<h3>٣. ملفات تعريف الارتباط (Cookies)</h3>
<p>نستخدم ملفات تعريف الارتباط والتقنيات المماثلة لتحسين أداء المنصة وتذكر تفضيلاتك وسلة التسوق وتسهيل تسجيل الدخول السريع في الزيارات القادمة.</p>

<h3>٤. حقوق المستخدم والتحكم في البيانات</h3>
<p>يحق لك في أي وقت الوصول إلى بياناتك الشخصية أو تعديلها أو طلب حذف حسابك نهائياً من خلال إعدادات الحساب أو بالتواصل المباشر مع فريق الدعم الفني لفيورا.</p>`,
  },
  about: {
    key: "about",
    label: "من نحن",
    desc: "تعريف بمنصة فيورا ورسالتها وقيمها للمتسوق والتاجر",
    defaultTitle: "عن منصة فيورا (About Viora)",
    defaultHtml: `<h2>منصة فيورا — وجهتك الأولى للتسوق الموثوق</h2>
<p><strong>فيورا (Viora)</strong> هي منصة تجارة إلكترونية متطورة تجمع نخبة من أفضل المتاجر والماركات التجارية في وجهة واحدة، لتوفر تجربة تسوق عصرية وسلسة تضمن الجودة والموثوقية وسرعة التوصيل.</p>

<hr/>

<h3>رؤيتنا</h3>
<p>أن نكون المنصة الرائدة والأكثر ثقة في التجارة الإلكترونية إقليمياً، من خلال ربط المتسوقين بأفضل المنتجات والمتاجر المحلية مع ضمان تجربة رقمية استثنائية.</p>

<h3>رسالتنا</h3>
<p>تمكين أصحاب المتاجر ورواد الأعمال من تنمية أعمالهم وتوسيع نطاق وصولهم، مع تقديم تجربة تسوق آمنة، مريحة، ومتكاملة للمستهلك من لحظة استعراض المنتج وحتى استلامه.</p>

<blockquote><strong>قيمنا الأساسية:</strong> الموثوقية العالية، الشفافية التامة، دعم المتاجر المحلية، والالتزام بأعلى معايير خدمة العملاء.</blockquote>

<h3>ما الذي يميّز تجربة فيورا؟</h3>
<ul>
  <li><strong>متاجر موثقة ومعتمدة:</strong> جميع المتاجر المشاركة تخضع للتحقق لضمان جودة وأصالة كافة المنتجات المعروضة.</li>
  <li><strong>توصيل سريع وموثوق:</strong> شبكة لوجستية متطورة تضمن وصول الطلبات في أسرع وقت ممكن وبأعلى درجات العناية.</li>
  <li><strong>طرق دفع مرنة وآمنة:</strong> نوفر الدفع عند الاستلام بالإضافة لخيارات الدفع الرقمي الآمنة بالكامل.</li>
  <li><strong>فريق دعم مخصص:</strong> خدمة عملاء مستمرة لمساعدتك ومتابعة كافة استفساراتك وطلباتك بكل احترافية.</li>
</ul>`,
  },
  faq: {
    key: "faq",
    label: "الأسئلة الشائعة",
    desc: "دليل إجابات وتوضيحات عن الشراء والشحن والتقييم والإلغاء",
    defaultTitle: "الأسئلة الشائعة حول منصة فيورا (FAQ)",
    defaultHtml: `<h3>كيف بقدر أطلب من ڤيورا؟</h3>
<p>اختار المنتج واللون والمقاس، ضيفه للسلة، وأكّد الطلب مع عنوانك. بيوصل طلبك للمتجر فوراً وبتبدأ مرحلة التجهيز والتوصيل.</p>

<h3>ليش طلبي انقسم لأكتر من طلب؟</h3>
<p>لأنك طلبت من أكثر من متجر بنفس السلة. كل متجر بيجهّز ويشحن منتجاته بشكل مستقل، فممكن يوصلوك بأوقات مختلفة حسب موقع كل متجر وتجهيزه.</p>

<h3>بقدر ألغي طلبي؟</h3>
<p>بتقدر تلغي طلب المتجر طول ما هو <strong>بانتظار الموافقة</strong>. بعد ما المتجر يقبله أو يبدأ تجهيزه، ما عاد بتقدر تلغيه مباشرة من التطبيق.</p>

<h3>إيمتى بقدر أقيّم المنتج؟</h3>
<p>بعد ما تستلم طلبك وتتحول حالته إلى «تم التوصيل». بيفتحلك خيار التقييم وبتحط النجوم وتعليقك لكل صنف استلمته.</p>

<h3>كيف بتواصل مع المتجر؟</h3>
<p>معلومات التواصل ورقم الهاتف موجودين بصفحة المتجر، وبتلاقي تفاصيل الطلب وخيارات المتابعة بشاشة «طلباتي» في أي وقت.</p>`,
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
        setErrors(prev => ({...prev, [savedKey]: Object.values(res.errors || {}).join(" · ") || res.message || "تعذر حفظ الصفحة"}));
      }
    } catch {
      setErrors(prev => ({...prev, [savedKey]: "تعذر حفظ الصفحة، يرجى المحاولة لاحقاً"}));
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
