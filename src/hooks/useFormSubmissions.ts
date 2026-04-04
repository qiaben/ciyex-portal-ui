"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export interface FormSubmission {
    id: number;
    formKey: string;
    formTitle: string;
    formDescription?: string;
    status: "pending" | "accepted" | "rejected";
    responseData: Record<string, any>;
    submittedDate: string;
    reviewedDate?: string;
    reviewNote?: string;
}

export function useFormSubmissions() {
    const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSubmissions = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchWithAuth("/api/portal/form-submissions/my");
            if (res.ok) {
                const json = await res.json();
                const data = json.data || json;
                setSubmissions(Array.isArray(data) ? data : data?.content || []);
            } else {
                setError("Failed to load submissions");
            }
        } catch (err) {
            console.error("Failed to load form submissions:", err);
            setError("Failed to load submissions");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    return { submissions, loading, error, refetch: fetchSubmissions };
}
