"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { usePortalForms, type PortalFormDef } from "@/hooks/usePortalConfig";
import { ArrowLeft, Send, Loader2, CheckCircle2 } from "lucide-react";

export default function FormFillPage() {
    const params = useParams();
    const router = useRouter();
    const formKey = params?.formKey as string;

    const { forms, loading: formsLoading } = usePortalForms("custom");
    const [form, setForm] = useState<PortalFormDef | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (!formsLoading && forms.length > 0) {
            const found = forms.find((f) => f.formKey === formKey);
            setForm(found || null);
        }
    }, [forms, formsLoading, formKey]);

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
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!form) {
        return (
            <div className="p-6 max-w-3xl mx-auto">
                <button
                    onClick={() => router.push("/forms")}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Forms
                </button>
                <div className="text-center py-12">
                    <p className="text-gray-500">Form not found or no longer available.</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
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
                            onClick={() => router.push("/forms")}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Back to Forms
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
        );
    }

    return (
        <div className="p-6 max-w-3xl mx-auto">
            {/* Back */}
            <button
                onClick={() => router.push("/forms")}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Forms
            </button>

            {/* Form Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-600">
                    <h1 className="text-lg font-bold text-white">{form.title}</h1>
                    {form.description && (
                        <p className="text-blue-100 text-sm mt-1">{form.description}</p>
                    )}
                </div>

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
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                    <button
                        onClick={() => router.push("/forms")}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                        Cancel
                    </button>
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

            {/* JSON Preview (debug-friendly) */}
            {Object.keys(formData).length > 0 && (
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
