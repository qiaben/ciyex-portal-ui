"use client";

import { useState, useRef, useEffect } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { useDocuments } from "@/hooks/useDocuments";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "@/components/tables/Pagination";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { FileText, FolderOpen, Lock, AlertCircle, Download, Eye, Upload, X, CloudUpload } from "lucide-react";

function fmtDate(d?: string) {
    if (!d) return "—";
    try {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch { return "—"; }
}

function categoryBadge(cat?: string) {
    const c = (cat || "").toLowerCase();
    const cls =
        c === "clinical" ? "bg-blue-100 text-blue-700" :
        c === "lab" ? "bg-green-100 text-green-700" :
        c === "imaging" ? "bg-purple-100 text-purple-700" :
        c === "insurance" ? "bg-amber-100 text-amber-700" :
        "bg-gray-100 text-gray-600";
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{cat || "Other"}</span>;
}

const DEFAULT_CATEGORIES = [
    "Clinical Note", "Discharge Summary", "Lab Report", "Imaging Report",
    "Consent Form", "Referral Letter", "Insurance Document",
    "Identification", "Prescription", "Other"
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function DocumentsPage() {
    const { documents, loading, error, downloadDocument, viewDocument, uploadDocument } = useDocuments();
    const { currentPage, totalPages, paginatedItems, onPageChange, totalItems, startItem, endItem } = usePagination(documents, 10);
    const [showModal, setShowModal] = useState(false);
    const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

    useEffect(() => {
        fetchWithAuth("/api/fhir/portal/documents/categories")
            .then((r) => r.json())
            .then((d) => {
                if (d.success !== false && Array.isArray(d.data) && d.data.length > 0) setCategories(d.data);
            })
            .catch(() => {});
    }, []);

    const [file, setFile] = useState<File | null>(null);
    const [category, setCategory] = useState("Clinical");
    const [description, setDescription] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadAlert, setUploadAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setFile(null);
        setCategory("Clinical");
        setDescription("");
        setUploadAlert(null);
    };

    const handleClose = () => {
        resetForm();
        setShowModal(false);
    };

    const handleFileSelect = (selected: File | null) => {
        setUploadAlert(null);
        if (!selected) return;
        if (selected.size > MAX_FILE_SIZE) {
            setUploadAlert({ type: "error", message: "File size exceeds 10 MB limit." });
            return;
        }
        setFile(selected);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) handleFileSelect(dropped);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setUploadAlert(null);
        try {
            await uploadDocument(file, category, description);
            resetForm();
            setShowModal(false);
        } catch (e: any) {
            setUploadAlert({ type: "error", message: e?.message || "Failed to upload document. Please try again." });
        } finally {
            setUploading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Medical Documents</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Access your medical records, test results, and documents</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Upload className="h-4 w-4" />
                        Upload Document
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                ) : error ? (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-5">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-semibold text-amber-800">Unable to load documents</h3>
                            <p className="text-sm text-amber-700 mt-1">Please contact your healthcare provider if you believe you should have access.</p>
                        </div>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-sm font-semibold text-gray-900">No documents yet</h3>
                        <p className="text-sm text-gray-500 mt-1">Upload your medical documents for your provider to review.</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Upload className="h-4 w-4" />
                            Upload Your First Document
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div>
                                <div>
                                    <p className="text-xs text-gray-500">Total Documents</p>
                                    <p className="text-lg font-bold text-gray-900">{documents.length}</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg"><CloudUpload className="h-5 w-5 text-indigo-600" /></div>
                                <div>
                                    <p className="text-xs text-gray-500">My Uploads</p>
                                    <p className="text-lg font-bold text-gray-900">{documents.filter((d: any) => d.type === 'patient-upload').length}</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                                <div className="p-2 bg-green-50 rounded-lg"><FolderOpen className="h-5 w-5 text-green-600" /></div>
                                <div>
                                    <p className="text-xs text-gray-500">Categories</p>
                                    <p className="text-lg font-bold text-gray-900">{new Set(documents.map((d: any) => d.category)).size}</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                                <div className="p-2 bg-purple-50 rounded-lg"><Lock className="h-5 w-5 text-purple-600" /></div>
                                <div>
                                    <p className="text-xs text-gray-500">Encrypted</p>
                                    <p className="text-lg font-bold text-gray-900">{documents.filter((d: any) => d.encrypted).length}</p>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50/50">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Document</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {paginatedItems.map((doc: any, i: number) => (
                                            <tr key={doc.id || i} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="text-sm font-medium text-gray-900">{doc.fileName}</span>
                                                    {doc.description && <div className="text-xs text-gray-400 mt-0.5">{doc.description}</div>}
                                                </td>
                                                <td className="px-4 py-3">{categoryBadge(doc.category)}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-gray-700">{fmtDate(doc.createdDate)}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {doc.type === 'patient-upload' ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                                            <CloudUpload className="h-3 w-3" /> My Upload
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                            Provider
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => viewDocument(doc.id)}
                                                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors" title="View"
                                                        ><Eye className="h-4 w-4" /></button>
                                                        <button
                                                            onClick={() => downloadDocument(doc.id)}
                                                            className="p-1 text-green-600 hover:text-green-800 transition-colors" title="Download"
                                                        ><Download className="h-4 w-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={onPageChange}
                                totalItems={totalItems}
                                startItem={startItem}
                                endItem={endItem}
                                label="documents"
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Upload Document Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={handleClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
                            <X className="h-5 w-5" />
                        </button>

                        <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Upload a medical document for your provider to review</p>

                        {uploadAlert && (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium mt-4 ${
                                uploadAlert.type === "success"
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "bg-red-50 text-red-700 border border-red-200"
                            }`}>
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                {uploadAlert.message}
                            </div>
                        )}

                        {/* Drop Zone */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`mt-5 relative cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
                                dragActive
                                    ? "border-blue-400 bg-blue-50"
                                    : file
                                        ? "border-green-300 bg-green-50"
                                        : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff,.bmp,.txt,.csv,.xml,.hl7"
                                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                            />
                            {file ? (
                                <div className="flex items-center justify-center gap-2">
                                    <FileText className="h-6 w-6 text-green-500" />
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-gray-900 truncate max-w-[220px]">{file.name}</p>
                                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                        className="ml-1 p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-gray-700">
                                        {dragActive ? "Drop file here" : "Drag & drop or click to browse"}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">PDF, DOC, JPG, PNG, TIFF up to 10 MB</p>
                                </>
                            )}
                        </div>

                        {/* Category */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                                {categories.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Description */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of the document"
                                rows={2}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? (
                                    <>
                                        <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                                        Uploading...
                                    </>
                                ) : "Upload"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
