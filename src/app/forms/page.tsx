"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/app/(admin)/layout";
import { usePortalForms, type PortalFormDef } from "@/hooks/usePortalConfig";
import { useFormSubmissions, type FormSubmission } from "@/hooks/useFormSubmissions";
import { ClipboardList, ChevronRight, Clock, CheckCircle2, XCircle, FileText } from "lucide-react";

export default function FormsPage() {
    const router = useRouter();
    const { forms, loading: formsLoading } = usePortalForms("custom");
    const { submissions, loading: subsLoading } = useFormSubmissions();
    const [activeTab, setActiveTab] = useState<"available" | "submitted">("available");

    const loading = formsLoading || subsLoading;

    if (loading) {
        return (
            <AdminLayout>
                <div className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-48" />
                        <div className="h-4 bg-gray-200 rounded w-72" />
                        <div className="space-y-3 mt-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-24 bg-gray-200 rounded-lg" />
                            ))}
                        </div>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="p-6 max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-blue-600" />
                        Forms
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Complete forms requested by your care team
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab("available")}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === "available"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Available Forms ({forms.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("submitted")}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === "submitted"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        My Submissions ({submissions.length})
                    </button>
                </div>

                {/* Available Forms */}
                {activeTab === "available" && (
                    <div className="space-y-3">
                        {forms.length === 0 ? (
                            <EmptyState
                                icon={<FileText className="w-12 h-12 text-gray-300" />}
                                title="No Forms Available"
                                description="There are no forms to complete at this time."
                            />
                        ) : (
                            forms.map((form) => (
                                <FormCard
                                    key={form.id}
                                    form={form}
                                    onClick={() => router.push(`/forms/${form.formKey}`)}
                                />
                            ))
                        )}
                    </div>
                )}

                {/* Submissions */}
                {activeTab === "submitted" && (
                    <div className="space-y-3">
                        {submissions.length === 0 ? (
                            <EmptyState
                                icon={<ClipboardList className="w-12 h-12 text-gray-300" />}
                                title="No Submissions"
                                description="You haven't submitted any forms yet."
                            />
                        ) : (
                            submissions.map((sub) => (
                                <SubmissionCard key={sub.id} submission={sub} />
                            ))
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

function FormCard({ form, onClick }: { form: PortalFormDef; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all group"
        >
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {form.title}
                    </h3>
                    {form.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {form.description}
                        </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                        {form.settings?.required && (
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-medium rounded-full">
                                Required
                            </span>
                        )}
                        {form.settings?.requireSignature && (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-medium rounded-full">
                                Signature Required
                            </span>
                        )}
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0 ml-3" />
            </div>
        </button>
    );
}

function SubmissionCard({ submission }: { submission: FormSubmission }) {
    const statusConfig = {
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

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
            <div className="flex justify-center mb-3">{icon}</div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
    );
}
