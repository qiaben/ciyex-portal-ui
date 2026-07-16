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
  note?: string;
  fields: FieldDef[];
}

// Reusable option lists (mirrors the paper "Prudent Medical Registration" form).
const RELATIONSHIP_OPTIONS = ["", "Self", "Spouse", "Child", "Parent", "Other"];

// Intake structure mirrors the practice's "Prudent Medical Registration" form.
const SECTIONS: SectionDef[] = [
  {
    title: "Patient Information",
    fields: [
      { name: "prefix", label: "Title", type: "select", options: ["", "Dr.", "Miss", "Mr.", "Mrs.", "Ms.", "Sir"] },
      { name: "lastName", label: "Last Name", required: true },
      { name: "firstName", label: "First Name", required: true },
      { name: "middleInitial", label: "Middle Initial" },
      { name: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
      { name: "sex", label: "Sex", type: "select", options: ["", "Female", "Male", "Transgender"] },
      { name: "ssn", label: "Social Security Number", placeholder: "###-##-####" },
      { name: "maritalStatus", label: "Marital Status", type: "select", options: ["", "Married", "Single", "Divorced", "Widowed", "Legally Separated", "Partner"] },
      { name: "addressLine1", label: "Address Line 1", colSpan: 2 },
      { name: "addressLine2", label: "Address Line 2", colSpan: 2 },
      { name: "city", label: "City" },
      { name: "state", label: "State" },
      { name: "postalCode", label: "Zip Code" },
      { name: "homePhone", label: "Home Phone", type: "tel" },
      { name: "mobilePhone", label: "Cell Phone", type: "tel", required: true },
      { name: "workPhone", label: "Work Phone", type: "tel" },
      { name: "workPhoneExt", label: "Work Ext." },
      { name: "email", label: "Email", type: "email" },
      { name: "race", label: "Race", type: "select", options: ["", "American Indian/Alaska Native", "Asian", "Native Hawaiian/Pacific Islander", "Black/African American", "White", "Hispanic", "Other"] },
      { name: "ethnicity", label: "Ethnicity", type: "select", options: ["", "Hispanic or Latino", "Not Hispanic or Latino", "Decline to answer"] },
      { name: "language", label: "Preferred Language", type: "select", options: ["", "English", "Spanish", "Indian", "Japanese", "Chinese", "German", "Russian", "Other"] },
      { name: "employerName", label: "Employer Name" },
      { name: "employerPhone", label: "Employer Phone", type: "tel" },
      { name: "employmentStatus", label: "Employment Status", type: "select", options: ["", "Full-time", "Part-time", "Self-Employed", "Retired", "Active Military"] },
      { name: "studentStatus", label: "Student Status", type: "select", options: ["", "Full-time", "Part-time", "Not a Student"] },
    ],
  },
  {
    title: "Primary Insurance Information",
    fields: [
      { name: "primaryInsuranceCompany", label: "Insurance Company" },
      { name: "primaryInsurancePhone", label: "Insurance Phone", type: "tel" },
      { name: "primaryInsuredName", label: "Name of Insured" },
      { name: "primaryRelationshipToInsured", label: "Relationship to Insured", type: "select", options: RELATIONSHIP_OPTIONS },
      { name: "primarySubscriberId", label: "Subscriber ID (Policy Number)" },
      { name: "primaryGroupId", label: "Group ID" },
      { name: "primaryCopay", label: "Copay ($)" },
      { name: "primaryInsuredDob", label: "Insured Date of Birth", type: "date" },
      { name: "primaryEffectiveDate", label: "Effective Date", type: "date" },
      { name: "primaryTerminationDate", label: "Termination Date", type: "date" },
    ],
  },
  {
    title: "Secondary Insurance Information",
    fields: [
      { name: "secondaryInsuranceCompany", label: "Insurance Company" },
      { name: "secondaryInsurancePhone", label: "Insurance Phone", type: "tel" },
      { name: "secondaryInsuredName", label: "Name of Insured" },
      { name: "secondaryRelationshipToInsured", label: "Relationship to Insured", type: "select", options: RELATIONSHIP_OPTIONS },
      { name: "secondarySubscriberId", label: "Subscriber ID (Policy Number)" },
      { name: "secondaryGroupId", label: "Group ID" },
      { name: "secondaryCopay", label: "Copay ($)" },
      { name: "secondaryInsuredDob", label: "Insured Date of Birth", type: "date" },
      { name: "secondaryEffectiveDate", label: "Effective Date", type: "date" },
      { name: "secondaryTerminationDate", label: "Termination Date", type: "date" },
    ],
  },
  {
    title: "Emergency Contact",
    fields: [
      { name: "emergencyContact1Name", label: "Contact 1 — Name" },
      { name: "emergencyContact1Relationship", label: "Contact 1 — Relationship" },
      { name: "emergencyContact1Cell", label: "Contact 1 — Cell", type: "tel" },
      { name: "emergencyContact1Work", label: "Contact 1 — Work", type: "tel" },
      { name: "emergencyContact1Other", label: "Contact 1 — Other Phone", type: "tel" },
      { name: "emergencyContact2Name", label: "Contact 2 — Name" },
      { name: "emergencyContact2Relationship", label: "Contact 2 — Relationship" },
      { name: "emergencyContact2Cell", label: "Contact 2 — Cell", type: "tel" },
      { name: "emergencyContact2Work", label: "Contact 2 — Work", type: "tel" },
      { name: "emergencyContact2Other", label: "Contact 2 — Other Phone", type: "tel" },
    ],
  },
  {
    title: "Authorization & Release",
    note:
      "I authorize release of any information concerning my (or my child's) health care, advice and treatment provided for the purpose of evaluating and administering claims for insurance benefits. I also authorize payment of insurance benefits otherwise payable to me directly to the doctor.",
    fields: [
      { name: "signature", label: "Signature (type your full name)", required: true, colSpan: 2, placeholder: "Signature of patient (or parent/guardian if minor)" },
      { name: "signatureDate", label: "Date", type: "date" },
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-5 px-4 text-sm">
      <div className="mx-auto max-w-4xl space-y-3">
        <div className="bg-gradient-to-r from-purple-500 to-orange-500 text-white px-4 py-3 rounded-lg shadow">
          <h1 className="text-lg font-bold">Patient Intake Form</h1>
          <p className="opacity-90 text-xs">
            {practiceName ? `${practiceName} — ` : ""}Please complete the form below. Fields marked * are required.
          </p>
        </div>

        {alert && <Alert variant={alert.variant} title={alert.title} message={alert.message} />}

        <form onSubmit={handleSubmit} className="space-y-3">
          {SECTIONS.map((section) => (
            <section
              key={section.title}
              className="bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <h2 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-100">{section.title}</h2>
              {section.note && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{section.note}</p>
              )}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
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

          <div className="flex justify-end pb-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm bg-green-500 text-white rounded-md font-medium disabled:opacity-60"
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
  const span = field.colSpan === 2 ? "col-span-2" : "";
  const labelEl = (
    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 truncate">
      {field.label}
      {field.required ? <span className="text-error-500"> *</span> : null}
    </label>
  );
  const base = "w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-900";

  if (field.type === "textarea") {
    return (
      <div className={`space-y-0.5 ${span}`}>
        {labelEl}
        <textarea
          name={field.name}
          rows={2}
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
      <div className={`space-y-0.5 ${span}`}>
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
    <div className={`space-y-0.5 ${span}`}>
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
