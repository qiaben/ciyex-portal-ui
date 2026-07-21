"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
// Plan types mirror the chart's Insurance tab "Plan Type" options.
const PLAN_TYPE_OPTIONS = ["", "HMO", "PPO", "EPO", "POS", "HDHP", "Medicare", "Medicaid", "TRICARE", "Workers' Comp", "Other"];

// Intake structure mirrors the practice's "Prudent Medical Registration" form.
const SECTIONS: SectionDef[] = [
  {
    title: "Patient Information",
    fields: [
      { name: "prefix", label: "Title", type: "select", options: ["", "Dr.", "Miss", "Mr.", "Mrs.", "Ms.", "Sir"] },
      { name: "lastName", label: "Last Name", required: true, placeholder: "Last name" },
      { name: "firstName", label: "First Name", required: true, placeholder: "First name" },
      { name: "middleInitial", label: "Middle Initial", placeholder: "M" },
      { name: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
      { name: "sex", label: "Sex", type: "select", options: ["", "Female", "Male", "Transgender"] },
      { name: "ssn", label: "Social Security Number", placeholder: "###-##-####" },
      { name: "maritalStatus", label: "Marital Status", type: "select", options: ["", "Married", "Single", "Divorced", "Widowed", "Legally Separated", "Partner"] },
      { name: "addressLine1", label: "Address Line 1", colSpan: 2, placeholder: "Street address" },
      { name: "addressLine2", label: "Address Line 2", colSpan: 2, placeholder: "Apt, suite, unit (optional)" },
      { name: "city", label: "City", placeholder: "City" },
      { name: "state", label: "State", placeholder: "State" },
      { name: "postalCode", label: "Zip Code", placeholder: "Enter ZIP — city & state auto-fill" },
      { name: "homePhone", label: "Home Phone", type: "tel" },
      { name: "mobilePhone", label: "Cell Phone", type: "tel", required: true },
      { name: "workPhone", label: "Work Phone", type: "tel" },
      { name: "workPhoneExt", label: "Work Ext.", placeholder: "e.g. 1234" },
      { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
      { name: "race", label: "Race", type: "select", options: ["", "American Indian/Alaska Native", "Asian", "Native Hawaiian/Pacific Islander", "Black/African American", "White", "Hispanic", "Prefer not to say"] },
      { name: "ethnicity", label: "Ethnicity", type: "select", options: ["", "Hispanic or Latino", "Not Hispanic or Latino", "Decline to answer"] },
      { name: "language", label: "Preferred Language", type: "select", options: ["", "English", "Spanish", "Indian", "Japanese", "Chinese", "German", "Russian", "Other"] },
      { name: "employerName", label: "Employer Name", placeholder: "Employer / company name" },
      { name: "employerPhone", label: "Employer Phone", type: "tel" },
      { name: "employmentStatus", label: "Employment Status", type: "select", options: ["", "Full-time", "Part-time", "Self-Employed", "Retired", "Active Military"] },
      { name: "studentStatus", label: "Student Status", type: "select", options: ["", "I am a student", "I am not a student"] },
    ],
  },
  {
    title: "Primary Insurance Information",
    fields: [
      { name: "primaryInsuranceCompany", label: "Insurance Company", placeholder: "Insurance company name" },
      { name: "primaryPlanName", label: "Plan Name", placeholder: "e.g. Blue Cross PPO Gold" },
      { name: "primaryPlanType", label: "Plan Type", type: "select", options: PLAN_TYPE_OPTIONS },
      { name: "primaryInsurancePhone", label: "Insurance Phone", type: "tel" },
      { name: "primaryInsuredName", label: "Name of Insured", placeholder: "Full name of the insured" },
      { name: "primaryRelationshipToInsured", label: "Relationship to Insured", type: "select", options: RELATIONSHIP_OPTIONS },
      { name: "primarySubscriberId", label: "Subscriber ID (Policy Number)", placeholder: "Policy number" },
      { name: "primaryGroupId", label: "Group ID", placeholder: "Group number" },
      { name: "primaryCopay", label: "Copay ($)", placeholder: "e.g. 25" },
      { name: "primaryInsuredDob", label: "Insured Date of Birth", type: "date" },
      { name: "primaryEffectiveDate", label: "Effective Date", type: "date" },
      { name: "primaryTerminationDate", label: "Termination Date", type: "date" },
    ],
  },
  {
    title: "Secondary Insurance Information",
    fields: [
      { name: "secondaryInsuranceCompany", label: "Insurance Company", placeholder: "Insurance company name" },
      { name: "secondaryPlanName", label: "Plan Name", placeholder: "e.g. Blue Cross PPO Gold" },
      { name: "secondaryPlanType", label: "Plan Type", type: "select", options: PLAN_TYPE_OPTIONS },
      { name: "secondaryInsurancePhone", label: "Insurance Phone", type: "tel" },
      { name: "secondaryInsuredName", label: "Name of Insured", placeholder: "Full name of the insured" },
      { name: "secondaryRelationshipToInsured", label: "Relationship to Insured", type: "select", options: RELATIONSHIP_OPTIONS },
      { name: "secondarySubscriberId", label: "Subscriber ID (Policy Number)", placeholder: "Policy number" },
      { name: "secondaryGroupId", label: "Group ID", placeholder: "Group number" },
      { name: "secondaryCopay", label: "Copay ($)", placeholder: "e.g. 25" },
      { name: "secondaryInsuredDob", label: "Insured Date of Birth", type: "date" },
      { name: "secondaryEffectiveDate", label: "Effective Date", type: "date" },
      { name: "secondaryTerminationDate", label: "Termination Date", type: "date" },
    ],
  },
  {
    title: "Emergency Contact",
    fields: [
      { name: "emergencyContact1Name", label: "Contact 1 — Name", placeholder: "Full name" },
      { name: "emergencyContact1Relationship", label: "Contact 1 — Relationship", placeholder: "e.g. Spouse" },
      { name: "emergencyContact1Cell", label: "Contact 1 — Cell", type: "tel" },
      { name: "emergencyContact1Work", label: "Contact 1 — Work", type: "tel" },
      { name: "emergencyContact1Other", label: "Contact 1 — Other Phone", type: "tel" },
      { name: "emergencyContact2Name", label: "Contact 2 — Name", placeholder: "Full name" },
      { name: "emergencyContact2Relationship", label: "Contact 2 — Relationship", placeholder: "e.g. Parent" },
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

/** Format/limit a value to a US phone number as the user types: (XXX) XXX-XXXX. */
function formatUsPhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  // Drop a leading US country code if present.
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);
  const area = digits.slice(0, 3);
  const mid = digits.slice(3, 6);
  const last = digits.slice(6, 10);
  if (digits.length > 6) return `(${area}) ${mid}-${last}`;
  if (digits.length > 3) return `(${area}) ${mid}`;
  if (digits.length > 0) return `(${area}`;
  return "";
}

/** A US phone number is complete when it has exactly 10 digits. */
function isValidUsPhone(value: string): boolean {
  return value.replace(/\D/g, "").length === 10;
}

/* ---- US date handling — mirrors the Ciyex EHR's masked MM/DD/YYYY inputs ---- */

/** Mask raw input to MM/DD/YYYY (auto-inserts slashes, caps at 10 chars). */
function maskUsDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** ISO (yyyy-mm-dd) → MM/DD/YYYY for display. */
function isoToUsDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[2]}/${m[3]}/${m[1]}` : "";
}

/** MM/DD/YYYY → ISO (yyyy-mm-dd), or "" when incomplete/invalid. */
function usToIsoDate(us: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(us || "");
  if (!m) return "";
  const [, mm, dd, yyyy] = m;
  const month = Number(mm), day = Number(dd), year = Number(yyyy);
  if (year < 1900 || year > 2100 || month < 1 || month > 12) return "";
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return "";
  return `${yyyy}-${mm}-${dd}`;
}

/* ---- ZIP → City/State auto-fill (Zippopotam, same source the EHR uses) ---- */
const zipCache = new Map<string, { city: string; state: string } | null>();
async function lookupZipCityState(zip: string): Promise<{ city: string; state: string } | null> {
  if (zipCache.has(zip)) return zipCache.get(zip) ?? null;
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`);
    if (!res.ok) {
      zipCache.set(zip, null);
      return null;
    }
    const body = await res.json();
    const place = Array.isArray(body?.places) ? body.places[0] : null;
    const out = place ? { city: String(place["place name"] || ""), state: String(place["state"] || "") } : null;
    zipCache.set(zip, out);
    return out;
  } catch {
    return null;
  }
}

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
  // City/State freeze after a successful ZIP auto-fill (mirrors the EHR's
  // settings forms); typing a new ZIP releases them.
  const [zipAutoFilled, setZipAutoFilled] = useState(false);

  // OTP gate — the form only unlocks after the patient verifies a code sent to
  // the same phone/email the intake link was sent to.
  const [verificationToken, setVerificationToken] = useState<string>("");
  const [otpChannel, setOtpChannel] = useState<string>("");
  const [maskedRecipient, setMaskedRecipient] = useState<string>("");
  const [otpInput, setOtpInput] = useState<string>("");
  const [otpError, setOtpError] = useState<string>("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const allFields = useMemo(() => SECTIONS.flatMap((s) => s.fields), []);

  // Resend cooldown countdown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

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
          if (data?.channel) setOtpChannel(String(data.channel));
          if (data?.maskedRecipient) setMaskedRecipient(String(data.maskedRecipient));
          // Auto-send the verification code to the original phone/email.
          void sendOtp();
        } else {
          setInvalid("This intake link is no longer valid or has expired. Please contact the practice for a new link.");
        }
      } catch {
        setInvalid("We couldn't load your intake form. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    loadIntake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, token]);

  async function sendOtp(): Promise<void> {
    setOtpError("");
    setOtpBusy(true);
    try {
      const res = await fetch(`${API}/api/intake/public/${encodeURIComponent(token)}/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOtpError(body?.message || "Couldn't send the code. Please try again.");
        return;
      }
      const data = body?.data ?? {};
      if (data?.channel) setOtpChannel(String(data.channel));
      if (data?.maskedRecipient) setMaskedRecipient(String(data.maskedRecipient));
      setResendIn(30);
    } catch {
      setOtpError("Network error sending the code. Please try again.");
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setOtpError("");
    if (otpInput.trim().length < 4) {
      setOtpError("Enter the code we sent you.");
      return;
    }
    setOtpBusy(true);
    try {
      const res = await fetch(`${API}/api/intake/public/${encodeURIComponent(token)}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ code: otpInput.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOtpError(body?.message || "Incorrect code. Please try again.");
        return;
      }
      const data = body?.data ?? {};
      setVerificationToken(String(data?.verificationToken || ""));
      if (data?.practiceName) setPracticeName(String(data.practiceName));
      setResponses({ ...((data?.prefill ?? {}) as Responses) });
    } catch {
      setOtpError("Network error verifying the code. Please try again.");
    } finally {
      setOtpBusy(false);
    }
  }

  function handleChange(name: string, value: string) {
    setResponses((prev) => ({ ...prev, [name]: value }));
    if (name === "postalCode") {
      const zip = value.replace(/\D/g, "");
      if (zip.length === 5) {
        void lookupZipCityState(zip).then((hit) => {
          if (!hit || !hit.city) return;
          setResponses((prev) => ({ ...prev, city: hit.city, state: hit.state }));
          setZipAutoFilled(true);
        });
      } else if (zipAutoFilled) {
        // ZIP dropped below 5 digits — release the frozen City/State.
        setZipAutoFilled(false);
      }
    }
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

    // Any filled phone field must be a complete 10-digit US number.
    const badPhone = allFields.find(
      (f) => f.type === "tel" && (responses[f.name] || "").trim() && !isValidUsPhone(responses[f.name] || "")
    );
    if (badPhone) {
      setAlert({ variant: "error", title: "Invalid phone number", message: `"${badPhone.label}" must be a 10-digit US phone number, e.g. (555) 123-4567.` });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/intake/public/${encodeURIComponent(token)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ responses, verificationToken }),
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

  /* ---------- OTP gate ---------- */
  if (!verificationToken) {
    const channelWord = otpChannel === "SMS" ? "text message" : "email";
    return (
      <CenteredCard>
        <form onSubmit={verifyOtp} className="space-y-4">
          <div className="text-center space-y-1">
            <div className="text-4xl">🔒</div>
            <h1 className="text-xl font-semibold">Verify it&apos;s you</h1>
            <p className="text-sm text-gray-500">
              We sent a 6-digit code by {channelWord}
              {maskedRecipient ? <> to <span className="font-medium">{maskedRecipient}</span></> : ""}.
              Enter it to open your intake form.
            </p>
          </div>

          {otpError && <Alert variant="error" title="Verification" message={otpError} />}

          <input
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="Enter 6-digit code"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full text-center tracking-[0.5em] text-lg px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-900"
          />

          <button
            type="submit"
            disabled={otpBusy || otpInput.length < 4}
            className="w-full px-5 py-2 text-sm bg-green-500 text-white rounded-md font-medium disabled:opacity-60"
          >
            {otpBusy ? "Verifying…" : "Verify & continue"}
          </button>

          <div className="text-center text-xs text-gray-500">
            Didn&apos;t get it?{" "}
            {resendIn > 0 ? (
              <span>Resend in {resendIn}s</span>
            ) : (
              <button type="button" onClick={() => void sendOtp()} disabled={otpBusy} className="text-blue-600 hover:underline disabled:opacity-60">
                Resend code
              </button>
            )}
          </div>
        </form>
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
                    readOnly={zipAutoFilled && (field.name === "city" || field.name === "state")}
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
  readOnly,
}: {
  field: FieldDef;
  value: string;
  onChange: (name: string, value: string) => void;
  readOnly?: boolean;
}) {
  const span = field.colSpan === 2 ? "col-span-2" : "";
  const labelEl = (
    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 truncate">
      {field.label}
      {field.required ? <span className="text-error-500"> *</span> : null}
    </label>
  );
  const base = "w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-900";

  if (field.type === "date") {
    return (
      <div className={`space-y-0.5 ${span}`}>
        {labelEl}
        <UsDateInput field={field} value={value} onChange={onChange} base={base} />
      </div>
    );
  }

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

  const isTel = field.type === "tel";
  return (
    <div className={`space-y-0.5 ${span}`}>
      {labelEl}
      <input
        name={field.name}
        type={isTel ? "tel" : field.type || "text"}
        inputMode={isTel ? "numeric" : undefined}
        maxLength={isTel ? 14 : undefined}
        placeholder={field.placeholder || (isTel ? "(555) 123-4567" : undefined)}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(field.name, isTel ? formatUsPhone(e.target.value) : e.target.value)}
        className={`${base} ${readOnly ? "opacity-75 cursor-not-allowed" : ""}`}
      />
    </div>
  );
}

/**
 * MM/DD/YYYY masked text input with a native calendar picker — the same UX the
 * Ciyex EHR uses for date fields. The typed value is masked as the user types;
 * the calendar button opens the browser's date picker via a hidden
 * <input type="date">. The stored response value stays ISO (yyyy-mm-dd).
 */
function UsDateInput({
  field,
  value,
  onChange,
  base,
}: {
  field: FieldDef;
  value: string;
  onChange: (name: string, value: string) => void;
  base: string;
}) {
  const [text, setText] = useState(() => isoToUsDate(value) || value);
  const pickerRef = useRef<HTMLInputElement>(null);

  // External prefill (e.g. after OTP verify) — adopt it unless it matches what
  // the current text already encodes.
  useEffect(() => {
    if (usToIsoDate(text) !== value) {
      setText(isoToUsDate(value) || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleText(raw: string) {
    const masked = maskUsDate(raw);
    setText(masked);
    onChange(field.name, usToIsoDate(masked));
  }

  function openPicker() {
    const el = pickerRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      el.showPicker();
    } else {
      el.click();
    }
  }

  return (
    <div className="relative">
      <input
        name={field.name}
        type="text"
        inputMode="numeric"
        maxLength={10}
        placeholder="MM/DD/YYYY"
        value={text}
        onChange={(e) => handleText(e.target.value)}
        className={`${base} pr-9`}
      />
      <button
        type="button"
        aria-label={`Open calendar for ${field.label}`}
        onClick={openPicker}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-base leading-none p-1"
      >
        📅
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""}
        onChange={(e) => {
          const iso = e.target.value;
          setText(isoToUsDate(iso));
          onChange(field.name, iso);
        }}
        className="absolute right-0 bottom-0 w-px h-px opacity-0 pointer-events-none"
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
