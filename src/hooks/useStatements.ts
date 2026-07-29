import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { safeStr } from "@/utils/safeStr";

/** A downloadable patient-pay invoice statement. */
export type Statement = {
  id: string;
  invoiceNumber?: string;
  status?: string;
  totalAmount?: number;
  balanceDue?: number;
  issueDate?: string;
  dueDate?: string;
};

export function useStatements() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithAuth("/api/patient-pay/invoices/mine");
        if (res.ok) {
          const data = await res.json();
          const list: any[] = Array.isArray(data?.data) ? data.data : [];
          setStatements(
            list
              .filter((inv) => inv?.id)
              .map((inv) => ({
                id: String(inv.id),
                invoiceNumber: safeStr(inv.invoiceNumber, String(inv.id)),
                status: safeStr(inv.status),
                totalAmount: Number(inv.totalAmount ?? 0) || 0,
                balanceDue: Number(inv.balanceDue ?? 0) || 0,
                issueDate: inv.issueDate,
                dueDate: inv.dueDate,
              }))
          );
        }
      } catch (e) {
        console.error("Statements error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { statements, loading };
}

/** Download an invoice's statement PDF through the portal proxy. */
export async function downloadStatementPdf(id: string, invoiceNumber?: string): Promise<void> {
  const res = await fetchWithAuth(`/api/patient-pay/invoices/${encodeURIComponent(id)}/pdf`, {
    headers: { Accept: "application/pdf" },
  });
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice-${invoiceNumber || id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 4000);
}
