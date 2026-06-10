"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Alert from "@/components/ui/alert/Alert";

/* --------------------------------------------------------------------------
   Public patient-intake form.

   This page is opened from a tokenized link the patient receives by SMS or
   email — there is NO portal login. The token is validated against the public
   intake endpoint, which may return prefilled contact details. On submit the
   responses are posted back; the backend saves a pending form submission and,
   when the link was sent to someone not yet in the system, creates the patient
   record from these answers.
-------------------------------------------------------------------------- */

type FieldType = "text" | "date" | "email" | "tel" | "textarea" | "select";

interface FieldDef {
  name: string;
  label: string;
  type?: FieldType;
  options?: string[];
  required?: boolean;
  colSpan?: 1 | 2;
  placeholder?: string;
}

interface SectionDef {
  title: string;
  fields: FieldDef[];
}

// Intake structure adapted from the practice's "Simple Client Intake" template.
const SECTIONS: SectionDef[] = [
  {
    title: "Visit Information",
    fields: [
      { name: "intakeDate", label: "Date", type: "date" },
      { name: "providerName", label: "Provider / Associate" },
      { name: "reasonForVisit", label: "Reason for Visit", type: "textarea", colSpan: 2, placeholder: "Briefly describe the reason for your visit" },
    ],
  },
  {
    title: "Patient Information",
    fields: [
      { name: "firstName", label: "First Name", required: true },
      { name: "lastName", label: "Last Name", required: true },
      { name: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
      { name: "sex", label: "Sex", type: "select", options: ["", "Male", "Female", "Other", "Prefer not to say"] },
      { name: "maritalStatus", label: "Marital Status", type: "select", options: ["", "Single", "Married", "Divorced", "Widowed", "Other"] },
      { name: "ssn", label: "SSN (optional)", placeholder: "###-##-####" },
    ],
  },
  {
    title: "Contact",
    fields: [
      { name: "homePhone", label: "Home Phone", type: "tel" },
      { name: "mobilePhone", label: "Mobile Phone", type: "tel", required: true },
      { name: "workPhone", label: "Work Phone", type: "tel" },
      { name: "email", label: "Email", type: "email" },
    ],
  },
  {
    title: "Home Address",
    fields: [
      { name: "addressLine1", label: "Address Line 1", colSpan: 2 },
      { name: "addressLine2", label: "Address Line 2", colSpan: 2 },
      { name: "city", label: "City" },
      { name: "state", label: "State" },
      { name: "postalCode", label: "Postal Code" },
      { name: "country", label: "Country" },
    ],
  },
  {
    title: "Employment",
    fields: [
      { name: "employer", label: "Employer / Company" },
      { name: "occupation", label: "Position / Title" },
      { name: "supervisor", label: "Supervisor" },
      { name: "department", label: "Department" },
      { name: "workAddress", label: "Work Address", colSpan: 2 },
    ],
  },
  {
    title: "Emergency Contact",
    fields: [
      { name: "emergencyContactName", label: "Name" },
      { name: "emergencyContactPhone", label: "Phone", type: "tel" },
      { name: "emergencyContactRelationship", label: "Relationship" },
    ],
  },
  {
    title: "Insurance",
    fields: [
      { name: "insuranceProvider", label: "Insurance Provider" },
      { name: "insuranceMemberId", label: "Member ID" },
      { name: "insuranceGroupNumber", label: "Group Number" },
    ],
  },
  {
    title: "Additional Information",
    fields: [
      { name: "referredBy", label: "Referred By" },
      { name: "previousPatient", label: "Have you been seen here before?", type: "select", options: ["", "No", "Yes"] },
      { name: "comments", label: "Comments", type: "textarea", colSpan: 2, placeholder: "Anything else we should know" },
    ],
  },
];

type Responses = Record<string, string>;

export default function PatientIntakePage() {
  const params = useParams();
  const token = params?.token as string;
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [responses, setResponses] = useState<Responses>({});
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [practiceName, setPracticeName] = useState<string>("");
  const [alert, setAlert] = useState<{ variant: "success" | "error"; title: string; message: string } | null>(null);

  const allFields = useMemo(() => SECTIONS.flatMap((s) => s.fields), []);

  /* Validate the token and pull any prefilled contact details. */
  useEffect(() => {
    if (!token) {
      return;
    }
    async function loadIntake() {
      try {
        const res = await fetch(`${API}/api/intake/public/${encodeURIComponent(token)}`, {
          headers: { Accept: "application/json" },
        });
        if (res.status === 404 || res.status === 410) {
          setInvalid("This intake link is no longer valid or has expired. Please contact the practice for a new link.");
          return;
        }
        if (res.ok) {
          const body = await res.json().catch(() => ({}));
          const data = body?.data ?? body ?? {};
          if (data?.status === "submitted") {
            setSubmitted(true);
            return;
          }
          if (data?.practiceName) {
            setPracticeName(String(data.practiceName));
          }
          const prefill = (data?.prefill ?? {}) as Responses;
          setResponses({ ...prefill });
        }
        // If the endpoint isn't available yet, fall through to a blank form
        // rather than blocking the patient.
      } catch {
        // Network/endpoint not ready — show a blank form.
      } finally {
        setLoading(false);
      }
    }
    loadIntake();
  }, [API, token]);

  function handleChange(name: string, value: string) {
    setResponses((prev) => ({ ...prev, [name]: value }));
  }

  function firstMissingRequired(): FieldDef | undefined {
    return allFields.find((f) => f.required && !(responses[f.name] || "").trim());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlert(null);

    const missing = firstMissingRequired();
    if (missing) {
      setAlert({ variant: "error", title: "Missing information", message: `Please fill in "${missing.label}".` });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/intake/public/${encodeURIComponent(token)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ responses }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Submit failed (${res.status})`);
      }
      setSubmitted(true);
    } catch {
      setAlert({ variant: "error", title: "Could not submit", message: "Something went wrong submitting your form. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- States ---------- */
  if (loading) {
    return <CenteredCard><p className="text-center text-gray-500">Loading your intake form…</p></CenteredCard>;
  }

  if (invalid) {
    return (
      <CenteredCard>
        <Alert variant="error" title="Link unavailable" message={invalid} />
      </CenteredCard>
    );
  }

  if (submitted) {
    return (
      <CenteredCard>
        <div className="text-center space-y-3 py-6">
          <div className="text-5xl">✅</div>
          <h1 className="text-xl font-semibold">Thank you!</h1>
          <p className="text-gray-500">
            Your intake form has been submitted{practiceName ? ` to ${practiceName}` : ""}. The care team will review it before your visit.
          </p>
        </div>
      </CenteredCard>
    );
  }

  /* ---------- Form ---------- */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="bg-gradient-to-r from-purple-500 to-orange-500 text-white p-6 rounded-xl shadow">
          <h1 className="text-2xl font-bold">Patient Intake Form</h1>
          <p className="opacity-90 text-sm">
            {practiceName ? `${practiceName} — ` : ""}Please complete the form below. Fields marked * are required.
          </p>
        </div>

        {alert && <Alert variant={alert.variant} title={alert.title} message={alert.message} />}

        <form onSubmit={handleSubmit} className="space-y-6">
          {SECTIONS.map((section) => (
            <section
              key={section.title}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700"
            >
              <h2 className="text-lg font-semibold mb-4">{section.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {section.fields.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    value={responses[field.name] || ""}
                    onChange={handleChange}
                  />
                ))}
              </div>
            </section>
          ))}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit Intake Form"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Field + layout helpers
-------------------------------------------------------------------------- */

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (name: string, value: string) => void;
}) {
  const span = field.colSpan === 2 ? "md:col-span-2" : "";
  const labelEl = (
    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
      {field.label}
      {field.required ? <span className="text-error-500"> *</span> : null}
    </label>
  );
  const base = "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900";

  if (field.type === "textarea") {
    return (
      <div className={`space-y-1 ${span}`}>
        {labelEl}
        <textarea
          name={field.name}
          rows={3}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={base}
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className={`space-y-1 ${span}`}>
        {labelEl}
        <select
          name={field.name}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={base}
        >
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt || "Select…"}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${span}`}>
      {labelEl}
      <input
        name={field.name}
        type={field.type || "text"}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(field.name, e.target.value)}
        className={base}
      />
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow border border-gray-200 dark:border-gray-700">
        {children}
      </div>
    </div>
  );
}
