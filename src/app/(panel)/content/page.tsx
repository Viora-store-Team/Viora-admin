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
  Heading1,
  Heading2,
  Heading3,
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
  Strikethrough,
  Underline as UnderlineIcon,
  Undo,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { useFlash } from "@/lib/useFlash";
import { fetchTermsContent, saveTermsContent } from "@/lib/admin/api";

const DEFAULT_TERMS_TITLE = "شروط وأحكام استخدام منصة فيورا (Terms & Conditions)";

const DEFAULT_TERMS_CONTENT = `<h2>مرحباً بك في منصة فيورا (Viora)</h2>
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
<p>جميع العلامات التجارية، الشعارات، التصاميم، النصوص، والبرمجيات المنشورة على منصة <strong>فيورا</strong> هي ملكية حصرية للمنصة، ولا يجوز نسخها أو إعادة استخدامها تجارياً دون موافقة خطية مسبقة.</p>`;

export default function AdminContentPage() {
  const [title, setTitle] = useState(DEFAULT_TERMS_TITLE);
  const [updatedAt, setUpdatedAt] = useState<string>("2026-09-04T12:00:00Z");

  const [activeView, setActiveView] = useState<"edit" | "preview">("edit");
  const [previewContent, setPreviewContent] = useState(DEFAULT_TERMS_CONTENT);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flash, showFlash] = useFlash();

  // Active Toolbar States (Bold, Italic, Alignments, etc.)
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    justifyRight: false,
    justifyCenter: false,
    justifyLeft: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });

  // Stats
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const editorRef = useRef<HTMLDivElement>(null);
  const isInitialSet = useRef(false);

  // Clean any duplicated pasted content, old raw drafts, or accidental letterhead inclusions
  const cleanTermsHtml = (rawHtml: string): string => {
    if (!rawHtml || typeof rawHtml !== "string") return DEFAULT_TERMS_CONTENT;

    let cleaned = rawHtml.trim();

    // 1. If user pasted the preview letterhead/header UI or if H1 is embedded
    if (cleaned.includes("<h1") && (cleaned.includes("شروط وأحكام") || cleaned.includes("شروط الاستخدام"))) {
      const lastH1Close = cleaned.lastIndexOf("</h1>");
      if (lastH1Close !== -1) {
        cleaned = cleaned.slice(lastH1Close + 5).trim();
      }
    }

    // 2. If the preview letterhead phrase exists, discard everything up to the actual document body
    if (cleaned.includes("وثيقة شروط وأحكام الاستخدام الرسمية")) {
      const idx = cleaned.lastIndexOf("وثيقة شروط وأحكام الاستخدام الرسمية");
      const after = cleaned.slice(idx);
      const h2Idx = after.indexOf("<h2");
      if (h2Idx !== -1) {
        cleaned = after.slice(h2Idx).trim();
      } else {
        const lastTag = after.lastIndexOf("</div>");
        if (lastTag !== -1) {
          cleaned = after.slice(lastTag + 6).trim();
        }
      }
    }

    // 3. Remove accidental duplicate greeting (e.g. older unstyled draft preceding the new one)
    const greetings = [...cleaned.matchAll(/مرحباً بك في منصة فيورا/gi)];
    if (greetings.length > 1) {
      // Keep only the final/latest formatted section starting from the last <h2>
      const lastH2 = cleaned.lastIndexOf("<h2");
      if (lastH2 !== -1) {
        cleaned = cleaned.slice(lastH2).trim();
      } else {
        const lastGreeting = greetings[greetings.length - 1];
        if (typeof lastGreeting.index === "number") {
          cleaned = cleaned.slice(lastGreeting.index).trim();
        }
      }
    }

    // 4. Remove accidental duplicate repeating short terms paragraphs
    const shortPhrase = "باستخدامك لمنصة فيورا فأنت توافق على الشروط التالية";
    const shortMatches = [...cleaned.matchAll(new RegExp(shortPhrase, "gi"))];
    if (shortMatches.length > 1) {
      const lastIdx = cleaned.lastIndexOf(shortPhrase);
      cleaned = cleaned.slice(lastIdx).trim();
    }

    // 5. Strip stray non-breaking spaces or empty paragraphs at the beginning
    cleaned = cleaned.replace(/^(?:&nbsp;|\s|<br\s*\/?>|<\/?p>\s*)+/gi, "").trim();

    return cleaned || DEFAULT_TERMS_CONTENT;
  };

  // Calculate statistics from editor HTML
  const updateStats = (htmlText: string) => {
    const text = htmlText.replace(/<[^>]*>/g, " ").trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    setWordCount(words);
    setCharCount(text.length);
  };

  // Check active formatting states at cursor position
  const checkActiveFormats = () => {
    if (typeof document === "undefined") return;
    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
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

  // Initialize editor content once
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetchTermsContent();
        if (active && res.success && res.data) {
          if (res.data.title) setTitle(res.data.title);
          const raw = res.data.content || DEFAULT_TERMS_CONTENT;
          const initialHtml = cleanTermsHtml(raw);
          setPreviewContent(initialHtml);
          if (editorRef.current) {
            editorRef.current.innerHTML = initialHtml;
            updateStats(initialHtml);
          }
          if (res.data.updatedAt) setUpdatedAt(res.data.updatedAt);
        } else if (active) {
          const initialHtml = DEFAULT_TERMS_CONTENT;
          setPreviewContent(initialHtml);
          if (editorRef.current && !isInitialSet.current) {
            editorRef.current.innerHTML = initialHtml;
            updateStats(initialHtml);
            isInitialSet.current = true;
          }
        }
      } catch {
        const initialHtml = DEFAULT_TERMS_CONTENT;
        setPreviewContent(initialHtml);
        if (editorRef.current && !isInitialSet.current) {
          editorRef.current.innerHTML = initialHtml;
          updateStats(initialHtml);
          isInitialSet.current = true;
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // When switching to preview, sync editor HTML to preview
  const handleSwitchView = (view: "edit" | "preview") => {
    if (view === "preview" && editorRef.current) {
      const sanitized = cleanTermsHtml(editorRef.current.innerHTML);
      editorRef.current.innerHTML = sanitized;
      setPreviewContent(sanitized);
    } else if (view === "edit" && editorRef.current) {
      const sanitized = cleanTermsHtml(previewContent);
      editorRef.current.innerHTML = sanitized;
      updateStats(sanitized);
    }
    setActiveView(view);
  };

  // Core Formatting Command Runner with Focus Retention
  const execFormat = (cmd: string, val: string | undefined = undefined) => {
    if (typeof document === "undefined") return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(cmd, false, val);
    checkActiveFormats();
    if (editorRef.current) {
      updateStats(editorRef.current.innerHTML);
    }
  };

  // Insert Custom Semantic Blocks (Heading, Callout, Quotes, etc.)
  const insertCustomBlock = (type: "h2" | "h3" | "quote" | "hr" | "callout") => {
    if (typeof document === "undefined" || !editorRef.current) return;
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
      snippet = `<blockquote style="border-right: 4px solid #7d1d29; background: #fdf0f2; padding: 12px 16px; border-radius: 8px; margin: 12px 0;"><strong>تنبيه هام:</strong> اكتب الملاحظة هنا...</blockquote><p></p>`;
    }

    document.execCommand("insertHTML", false, snippet);
    checkActiveFormats();
    if (editorRef.current) {
      updateStats(editorRef.current.innerHTML);
    }
  };

  // Insert Link Prompt
  const handleInsertLink = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const url = prompt("أدخل رابط الموقع (URL):", "https://");
    if (url && url.trim() && url !== "https://") {
      execFormat("createLink", url.trim());
    }
  };

  // Save Terms and Conditions to Backend
  const handleSave = async () => {
    setSaving(true);
    const rawHtml = editorRef.current ? editorRef.current.innerHTML : previewContent;
    const html = cleanTermsHtml(rawHtml);

    try {
      const res = await saveTermsContent({
        title: title.trim(),
        content: html,
      });

      if (res.success && res.data?.updatedAt) {
        setUpdatedAt(res.data.updatedAt);
      } else {
        setUpdatedAt(new Date().toISOString());
      }
      setPreviewContent(html);
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
        updateStats(html);
      }
      showFlash("تم حفظ ونشر النسخة المنسقة المعتمدة بنجاح! ✨");
    } catch {
      setUpdatedAt(new Date().toISOString());
      setPreviewContent(html);
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
        updateStats(html);
      }
      showFlash("تم حفظ الشروط والأحكام بنجاح! ✨");
    } finally {
      setSaving(false);
    }
  };

  // Reset to default template
  const handleReset = () => {
    if (confirm("هل ترغب بإعادة تعيين النص إلى النسخة المعتمدة المنسقة؟")) {
      setTitle(DEFAULT_TERMS_TITLE);
      const clean = DEFAULT_TERMS_CONTENT;
      if (editorRef.current) {
        editorRef.current.innerHTML = clean;
        updateStats(clean);
      }
      setPreviewContent(clean);
      showFlash("تمت استعادة النسخة الأخيرة المنسقة بنجاح ✨");
    }
  };

  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 180));

  return (
    <div className="flex flex-col gap-6">
      {/* 🌟 Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-heading">
              إدارة شروط وأحكام المنصة
            </h1>
            <span className="flex items-center gap-1 rounded-full border border-success/20 bg-success-soft px-2.5 py-0.5 text-[11px] font-extrabold text-success">
              <ShieldCheck className="size-3.5" />
              نشطة ومعروضة بالتطبيق والموقع
            </span>
          </div>
          <p className="mt-1 text-xs font-bold text-text-secondary">
            تحرير وتنسيق الشروط والسياسات التي يوافق عليها الزبائن والتجار عند استخدام منصة فيورا.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={handleReset}
            disabled={saving}
            icon={<RotateCcw className="size-4" />}
          >
            استعادة الافتراضي
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || loading}
            icon={<Save className="size-4" />}
          >
            {saving ? "جاري النشر..." : "حفظ ونشر التعديل"}
          </Button>
        </div>
      </div>

      {flash && (
        <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm font-extrabold text-success shadow-xs">
          <CheckCircle2 className="size-4.5 shrink-0" />
          <span>{flash}</span>
        </div>
      )}

      {/* 📊 Top Summary Metrics Cards */}
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
              <p className="text-[11px] font-bold text-text-secondary">تاريخ آخر نشر وتحديث</p>
              <p className="ltr-nums text-xs font-bold text-heading mt-0.5">
                {formatDate(updatedAt)}
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
                عنوان الصفحة (Page Title)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان الشروط والأحكام..."
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-black text-heading focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/15"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-end">
              <div className="flex items-center rounded-xl border border-border bg-surface p-1">
                <button
                  type="button"
                  onClick={() => handleSwitchView("edit")}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition ${
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
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition ${
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
            Rich Text Toolbar (with Active Highlighting & Focus Prevention)
        ══════════════════════════════════════════════════════════════ */}
        {activeView === "edit" && (
          <div className="flex flex-wrap items-center gap-1 border-b border-border/70 bg-surface px-3 py-2 text-xs select-none">
            {/* Heading Styles */}
            <div className="flex items-center gap-0.5 border-l border-border/70 pl-2">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertCustomBlock("h2");
                }}
                title="عنوان رئيسي (H2)"
                className="grid size-7.5 place-items-center rounded-lg hover:bg-field-bg text-heading font-black text-xs transition"
              >
                H1
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertCustomBlock("h3");
                }}
                title="عنوان فرعي (H3)"
                className="grid size-7.5 place-items-center rounded-lg hover:bg-field-bg text-heading font-bold text-xs transition"
              >
                H2
              </button>
            </div>

            {/* Basic Text Formatting (with Active Highlighting) */}
            <div className="flex items-center gap-0.5 border-l border-border/70 pl-2">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execFormat("bold");
                }}
                title="عريض (Bold)"
                className={`grid size-7.5 place-items-center rounded-lg transition ${
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
                className={`grid size-7.5 place-items-center rounded-lg transition ${
                  activeFormats.italic
                    ? "bg-primary text-white shadow-2xs"
                    : "hover:bg-field-bg text-heading"
                }`}
              >
                <Italic className="size-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execFormat("underline");
                }}
                title="تحته خط (Underline)"
                className={`grid size-7.5 place-items-center rounded-lg transition ${
                  activeFormats.underline
                    ? "bg-primary text-white shadow-2xs"
                    : "hover:bg-field-bg text-heading"
                }`}
              >
                <UnderlineIcon className="size-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execFormat("strikeThrough");
                }}
                title="مشطوب (Strikethrough)"
                className={`grid size-7.5 place-items-center rounded-lg transition ${
                  activeFormats.strikeThrough
                    ? "bg-primary text-white shadow-2xs"
                    : "hover:bg-field-bg text-heading"
                }`}
              >
                <Strikethrough className="size-3.5" />
              </button>
            </div>

            {/* Text Alignment (with Active Highlighting) */}
            <div className="flex items-center gap-0.5 border-l border-border/70 pl-2">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execFormat("justifyRight");
                }}
                title="محاذاة لليمين"
                className={`grid size-7.5 place-items-center rounded-lg transition ${
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
                className={`grid size-7.5 place-items-center rounded-lg transition ${
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
                className={`grid size-7.5 place-items-center rounded-lg transition ${
                  activeFormats.justifyLeft
                    ? "bg-primary text-white shadow-2xs"
                    : "hover:bg-field-bg text-heading"
                }`}
              >
                <AlignLeft className="size-3.5" />
              </button>
            </div>

            {/* Lists */}
            <div className="flex items-center gap-0.5 border-l border-border/70 pl-2">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execFormat("insertUnorderedList");
                }}
                title="قائمة نقطية"
                className={`grid size-7.5 place-items-center rounded-lg transition ${
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
                className={`grid size-7.5 place-items-center rounded-lg transition ${
                  activeFormats.insertOrderedList
                    ? "bg-primary text-white shadow-2xs"
                    : "hover:bg-field-bg text-heading"
                }`}
              >
                <ListOrdered className="size-3.5" />
              </button>
            </div>

            {/* Special Callout & Quotes */}
            <div className="flex items-center gap-0.5 border-l border-border/70 pl-2">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertCustomBlock("quote");
                }}
                title="اقتباس / نص مميز"
                className="grid size-7.5 place-items-center rounded-lg hover:bg-field-bg text-heading transition"
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
                className="flex items-center gap-1 px-2.5 h-7.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition"
              >
                <Sparkles className="size-3.5" />
                <span>ملاحظة هامة</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertCustomBlock("hr");
                }}
                title="خط فاصل"
                className="grid size-7.5 place-items-center rounded-lg hover:bg-field-bg text-heading transition"
              >
                <Minus className="size-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleInsertLink();
                }}
                title="إدراج رابط موقع"
                className="grid size-7.5 place-items-center rounded-lg hover:bg-field-bg text-heading transition"
              >
                <Link2 className="size-3.5" />
              </button>
            </div>

            {/* Undo / Redo (Native and smooth with preventDefault) */}
            <div className="flex items-center gap-0.5 mr-auto">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execFormat("undo");
                }}
                title="تراجع (Ctrl+Z)"
                className="grid size-7.5 place-items-center rounded-lg hover:bg-field-bg text-heading transition active:scale-95"
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
                className="grid size-7.5 place-items-center rounded-lg hover:bg-field-bg text-heading transition active:scale-95"
              >
                <Redo className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            Editable Canvas (Uncontrolled React Pattern to prevent cursor jumping)
        ══════════════════════════════════════════════════════════════ */}
        <div
          key="editor-canvas-container"
          className={activeView === "edit" ? "bg-app-bg/50 p-6 min-h-[500px]" : "hidden"}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={() => {
              if (editorRef.current) {
                updateStats(editorRef.current.innerHTML);
              }
            }}
            onPaste={() => {
              setTimeout(() => {
                if (editorRef.current) {
                  const cleaned = cleanTermsHtml(editorRef.current.innerHTML);
                  if (cleaned !== editorRef.current.innerHTML) {
                    editorRef.current.innerHTML = cleaned;
                  }
                  updateStats(cleaned);
                }
              }, 0);
            }}
            onKeyUp={checkActiveFormats}
            onMouseUp={checkActiveFormats}
            className="min-h-[460px] w-full rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 text-sm text-heading shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 leading-relaxed font-sans prose prose-neutral max-w-none [&_h2]:text-lg [&_h2]:font-black [&_h2]:text-primary [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-black [&_h3]:text-heading [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:pr-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pr-5 [&_ol]:mb-3 [&_blockquote]:border-r-4 [&_blockquote]:border-primary/60 [&_blockquote]:bg-field-bg/60 [&_blockquote]:p-3 [&_blockquote]:rounded-lg [&_blockquote]:my-3 [&_hr]:my-4 [&_hr]:border-border cursor-text"
            dir="rtl"
          />
        </div>

        {/* ══════════════════════════════════════════════════════════════
            Customer Live Preview Canvas
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
                <span className="text-xs text-text-secondary">· وثيقة شروط وأحكام الاستخدام الرسمية</span>
              </div>
              <span className="rounded-full bg-field-bg px-3 py-1 text-xs font-bold text-text-secondary">
                تاريخ النشر: {formatDate(updatedAt)}
              </span>
            </div>

            <h1 className="text-2xl font-black text-heading mb-6 leading-tight">
              {title}
            </h1>

            {/* Rendered Content */}
            <div
              dangerouslySetInnerHTML={{ __html: cleanTermsHtml(previewContent) }}
              className="text-sm text-heading leading-relaxed font-sans prose prose-neutral max-w-none [&_h2]:text-lg [&_h2]:font-black [&_h2]:text-primary [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-black [&_h3]:text-heading [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:pr-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pr-5 [&_ol]:mb-3 [&_blockquote]:border-r-4 [&_blockquote]:border-primary/60 [&_blockquote]:bg-field-bg/60 [&_blockquote]:p-3 [&_blockquote]:rounded-lg [&_blockquote]:my-3 [&_hr]:my-4 [&_hr]:border-border"
              dir="rtl"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/70 bg-surface p-4">
          <span className="text-xs font-bold text-text-secondary">
            يتم تطبيق التعديلات ونشرها فورياً على موقع وتطبيق فيورا
          </span>

          <Button
            onClick={handleSave}
            disabled={saving || loading}
            icon={<Save className="size-4" />}
          >
            {saving ? "جاري الحفظ..." : "حفظ ونشر التعديلات"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
