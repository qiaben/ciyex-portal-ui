"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { usePortalForms, type PortalFormDef } from "@/hooks/usePortalConfig";
import { useFormSubmissions, type FormSubmission } from "@/hooks/useFormSubmissions";
import {
    Send, Loader2, CheckCircle2, Clock, XCircle,
    ClipboardList, FileText,
} from "lucide-react";

// Script injected into HTML template iframes to capture form submissions
const IFRAME_CAPTURE_SCRIPT = `
<script>
(function() {
  document.addEventListener('submit', function(e) {
    e.preventDefault();
    var form = e.target;
    var data = {};
    var elements = form.elements;
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (!el.name) continue;
      if (el.type === 'checkbox') {
        data[el.name] = el.checked;
      } else if (el.type === 'radio') {
        if (el.checked) data[el.name] = el.value;
      } else if (el.tagName === 'SELECT' && el.multiple) {
        var vals = [];
        for (var j = 0; j < el.options.length; j++) {
          if (el.options[j].selected) vals.push(el.options[j].value);
        }
        data[el.name] = vals;
      } else {
        data[el.name] = el.value;
      }
    }
    window.parent.postMessage({ type: 'FORM_SUBMIT', data: data }, '*');
  }, true);
})();
</script>`;

export default function FormFillPage() {
    const params = useParams();
    const router = useRouter();
    const formKey = params?.formKey as string;

    const { forms, loading: formsLoading } = usePortalForms("custom");
    const { submissions, loading: subsLoading } = useFormSubmissions();
    const [form, setForm] = useState<PortalFormDef | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [activeTab, setActiveTab] = useState<"fill" | "submissions">("fill");

    // HTML template form state
    const [templateHtml, setTemplateHtml] = useState<string | null>(null);
    const [templateLoading, setTemplateLoading] = useState(false);
    const [templateError, setTemplateError] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (!formsLoading && forms.length > 0) {
            const found = forms.find((f) => f.formKey === formKey);
            setForm(found || null);
        }
    }, [forms, formsLoading, formKey]);

    // Determine if the form is an HTML template form
    const parsedFieldConfig = form
        ? typeof form.fieldConfig === "string"
            ? (() => { try { return JSON.parse(form.fieldConfig); } catch { return form.fieldConfig; } })()
            : form.fieldConfig
        : null;
    const isHtmlTemplate = parsedFieldConfig?.htmlTemplate === true;
    const templateDocId = parsedFieldConfig?.templateDocId;

    // Fetch HTML template when applicable
    useEffect(() => {
        if (!isHtmlTemplate || !templateDocId) return;
        let cancelled = false;
        setTemplateLoading(true);
        setTemplateError(null);

        fetchWithAuth(`/api/template-documents/${templateDocId}/render`)
            .then(async (res) => {
                if (cancelled) return;
                if (!res.ok) throw new Error(`Failed to load template (${res.status})`);
                const json = await res.json();
                const html = json.html || json.content || "";
                // Inject the capture script before </body> or at the end
                let modified: string;
                if (html.includes("</body>")) {
                    modified = html.replace("</body>", IFRAME_CAPTURE_SCRIPT + "</body>");
                } else {
                    modified = html + IFRAME_CAPTURE_SCRIPT;
                }
                setTemplateHtml(modified);
            })
            .catch((err) => {
                if (!cancelled) setTemplateError(err?.message || "Failed to load template");
            })
            .finally(() => {
                if (!cancelled) setTemplateLoading(false);
            });

        return () => { cancelled = true; };
    }, [isHtmlTemplate, templateDocId]);

    // Listen for postMessage from iframe
    const handleIframeMessage = useCallback(
        async (event: MessageEvent) => {
            if (event.data?.type !== "FORM_SUBMIT" || !form) return;

            setSaving(true);
            setError(null);

            try {
                const res = await fetchWithAuth("/api/portal/form-submissions", {
                    method: "POST",
                    body: JSON.stringify({
                        formId: form.id,
                        formKey: form.formKey,
                        formTitle: form.title,
                        formDescription: form.description,
                        responseData: event.data.data,
                    }),
                });

                if (res.ok) {
                    setSubmitted(true);
                } else {
                    const data = await res.json().catch(() => ({}));
                    setError(data.message || "Failed to submit form. Please try again.");
                }
            } catch {
                setError("Failed to submit form. Please try again.");
            } finally {
                setSaving(false);
            }
        },
        [form]
    );

    useEffect(() => {
        if (!isHtmlTemplate) return;
        window.addEventListener("message", handleIframeMessage);
        return () => window.removeEventListener("message", handleIframeMessage);
    }, [isHtmlTemplate, handleIframeMessage]);

    // Filter submissions for this specific form
    const formSubmissions = submissions.filter((s) => s.formKey === formKey);

    const handleFieldChange = (key: string, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        if (!form) return;

        // Validate required fields
        const fc = typeof form.fieldConfig === "string"
            ? JSON.parse(form.fieldConfig)
            : form.fieldConfig;

        const missingFields: string[] = [];
        if (fc?.sections) {
            for (const section of fc.sections) {
                for (const field of section.fields || []) {
                    if (field.required && !formData[field.key]) {
                        missingFields.push(field.label || field.key);
                    }
                }
            }
        }

        if (missingFields.length > 0) {
            setError(
                `Please fill in: ${missingFields.slice(0, 3).join(", ")}${
                    missingFields.length > 3 ? ` and ${missingFields.length - 3} more` : ""
                }`
            );
            return;
        }

        setError(null);
        setSaving(true);

        try {
            const res = await fetchWithAuth("/api/portal/form-submissions", {
                method: "POST",
                body: JSON.stringify({
                    formId: form.id,
                    formKey: form.formKey,
                    formTitle: form.title,
                    formDescription: form.description,
                    responseData: formData,
                }),
            });

            if (res.ok) {
                setSubmitted(true);
            } else {
                const data = await res.json().catch(() => ({}));
                setError(data.message || "Failed to submit form. Please try again.");
            }
        } catch {
            setError("Failed to submit form. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (formsLoading) {
        return (
            <AdminLayout>
                <div className="p-6 flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </AdminLayout>
        );
    }

    if (!form) {
        return (
            <AdminLayout>
                <div className="p-6 max-w-3xl mx-auto">
                    <div className="text-center py-12">
                        <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Form not found or no longer available.</p>
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (submitted) {
        return (
            <AdminLayout>
                <div className="p-6 max-w-3xl mx-auto">
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Form Submitted Successfully
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Your response to &ldquo;{form.title}&rdquo; has been submitted and is pending review.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => {
                                    setSubmitted(false);
                                    setFormData({});
                                    setActiveTab("submissions");
                                }}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                View Submissions
                            </button>
                            <button
                                onClick={() => router.push("/dashboard")}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="p-6 max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-blue-600" />
                        {form.title}
                    </h1>
                    {form.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {form.description}
                        </p>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab("fill")}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === "fill"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Fill Form
                    </button>
                    <button
                        onClick={() => setActiveTab("submissions")}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === "submissions"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        My Submissions ({formSubmissions.length})
                    </button>
                </div>

                {/* Fill Form Tab */}
                {activeTab === "fill" && isHtmlTemplate && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        {error && (
                            <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                                {error}
                            </div>
                        )}
                        {saving && (
                            <div className="mx-6 mt-4 flex items-center gap-2 text-sm text-blue-600">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Submitting...
                            </div>
                        )}
                        {templateLoading && (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        )}
                        {templateError && (
                            <div className="px-6 py-12 text-center">
                                <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                                <p className="text-sm text-gray-600">{templateError}</p>
                            </div>
                        )}
                        {templateHtml && !templateLoading && (
                            <iframe
                                ref={iframeRef}
                                srcDoc={templateHtml}
                                className="w-full border-0"
                                style={{ minHeight: "600px" }}
                                sandbox="allow-scripts allow-forms allow-same-origin"
                                title={`${form.title} form`}
                            />
                        )}
                    </div>
                )}

                {activeTab === "fill" && !isHtmlTemplate && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        {/* Form Fields */}
                        <div className="px-6 py-6">
                            {error && (
                                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                                    {error}
                                </div>
                            )}

                            <DynamicPortalForm
                                fieldConfig={form.fieldConfig}
                                data={formData}
                                onChange={handleFieldChange}
                            />
                        </div>

                        {/* Actions */}
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-end">
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                {saving ? "Submitting..." : "Submit Form"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Submissions Tab */}
                {activeTab === "submissions" && (
                    <div className="space-y-3">
                        {subsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                        ) : formSubmissions.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">No Submissions</h3>
                                <p className="text-xs text-gray-500 mt-1">You haven&apos;t submitted this form yet.</p>
                            </div>
                        ) : (
                            formSubmissions.map((sub) => (
                                <SubmissionCard key={sub.id} submission={sub} />
                            ))
                        )}
                    </div>
                )}

                {/* JSON Preview (debug-friendly, JSON forms only) */}
                {activeTab === "fill" && !isHtmlTemplate && Object.keys(formData).length > 0 && (
                    <details className="mt-4">
                        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                            View response data (JSON)
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs text-gray-600 overflow-x-auto border border-gray-200 dark:border-gray-700">
                            {JSON.stringify(formData, null, 2)}
                        </pre>
                    </details>
                )}
            </div>
        </AdminLayout>
    );
}

// ──────────────────────────────────────────────
// Submission Card
// ──────────────────────────────────────────────

function SubmissionCard({ submission }: { submission: FormSubmission }) {
    const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
        pending: { icon: Clock, color: "text-yellow-600 bg-yellow-50", label: "Pending Review" },
        accepted: { icon: CheckCircle2, color: "text-green-600 bg-green-50", label: "Accepted" },
        rejected: { icon: XCircle, color: "text-red-600 bg-red-50", label: "Rejected" },
    };
    const status = statusConfig[submission.status] || statusConfig.pending;
    const StatusIcon = status.icon;

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {submission.formTitle}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        Submitted: {new Date(submission.submittedDate).toLocaleDateString()}
                    </p>
                    {submission.reviewNote && (
                        <p className="text-xs text-gray-600 mt-1 italic">
                            Note: {submission.reviewNote}
                        </p>
                    )}
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {status.label}
                </div>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// Dynamic Form Renderer (reusable)
// ──────────────────────────────────────────────

function DynamicPortalForm({
    fieldConfig,
    data,
    onChange,
}: {
    fieldConfig: any;
    data: Record<string, any>;
    onChange: (key: string, value: any) => void;
}) {
    const fc = typeof fieldConfig === "string" ? JSON.parse(fieldConfig) : fieldConfig;
    if (!fc?.sections) return <p className="text-gray-400 text-sm">No form fields configured</p>;

    return (
        <div className="space-y-8">
            {fc.sections.map((section: any) => (
                <div key={section.key}>
                    {section.title && (
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                            {section.title}
                        </h3>
                    )}
                    <div
                        className="grid gap-4"
                        style={{ gridTemplateColumns: `repeat(${section.columns || 1}, minmax(0, 1fr))` }}
                    >
                        {(section.fields || []).map((field: any) => (
                            <div
                                key={field.key}
                                style={{ gridColumn: `span ${field.colSpan || 1}` }}
                            >
                                <PortalField
                                    field={field}
                                    value={data[field.key] ?? ""}
                                    onChange={(val) => onChange(field.key, val)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function PortalField({
    field,
    value,
    onChange,
}: {
    field: any;
    value: any;
    onChange: (val: any) => void;
}) {
    const { key, label, type, required, placeholder, helpText, options } = field;

    if (type === "computed" || type === "group") {
        return (
            <div className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 leading-relaxed">
                {helpText || label}
            </div>
        );
    }

    const labelEl = label ? (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
    ) : null;

    const inputClass =
        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";

    switch (type) {
        case "textarea":
            return (
                <div>
                    {labelEl}
                    <textarea
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        rows={3}
                        className={inputClass}
                    />
                </div>
            );

        case "select":
            return (
                <div>
                    {labelEl}
                    <select
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        className={inputClass}
                    >
                        <option value="">{placeholder || "Select..."}</option>
                        {(options || []).map((opt: any) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            );

        case "checkbox":
        case "boolean":
            return (
                <div className="flex items-start gap-3 py-1">
                    <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {label}
                        {required && <span className="text-red-500 ml-0.5">*</span>}
                    </span>
                </div>
            );

        case "date":
            return (
                <div>
                    {labelEl}
                    <input
                        type="date"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        className={inputClass}
                    />
                </div>
            );

        case "number":
            return (
                <div>
                    {labelEl}
                    <input
                        type="number"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className={inputClass}
                    />
                </div>
            );

        case "phone":
            return (
                <div>
                    {labelEl}
                    <input
                        type="tel"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder || "(555) 123-4567"}
                        className={inputClass}
                    />
                </div>
            );

        case "email":
            return (
                <div>
                    {labelEl}
                    <input
                        type="email"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder || "email@example.com"}
                        className={inputClass}
                    />
                </div>
            );

        case "radio":
            return (
                <div>
                    {labelEl}
                    <div className="flex flex-wrap gap-4 mt-1">
                        {(options || []).map((opt: any) => (
                            <label
                                key={opt.value}
                                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                            >
                                <input
                                    type="radio"
                                    name={key}
                                    value={opt.value}
                                    checked={value === opt.value}
                                    onChange={() => onChange(opt.value)}
                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                </div>
            );

        default:
            return (
                <div>
                    {labelEl}
                    <input
                        type="text"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className={inputClass}
                    />
                    {helpText && <p className="text-xs text-gray-400 mt-1">{helpText}</p>}
                </div>
            );
    }
}
