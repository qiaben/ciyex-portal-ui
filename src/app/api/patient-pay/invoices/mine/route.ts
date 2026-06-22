import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const PATIENT_PAY_URL =
  process.env.PATIENT_PAY_URL ||
  process.env.NEXT_PUBLIC_PATIENT_PAY_URL ||
  'http://localhost:8086';

/**
 * List the signed-in patient's invoices from ciyex-patient-pay so the portal can
 * offer a PDF download for each. The portal token identifies the patient via
 * the EHR `/api/portal/patient/me` profile; patient-pay stores the EHR patient
 * id, so we resolve it from the profile and query patient-pay by patient.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Authorization header required' },
        { status: 401 }
      );
    }

    const hdrs: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    };
    const orgAlias = request.headers.get('x-org-alias');
    if (orgAlias) hdrs['X-Org-Alias'] = orgAlias;

    // 1) Resolve the patient's EHR id from their portal profile.
    const meRes = await fetch(`${BACKEND_URL}/api/portal/patient/me`, { headers: hdrs });
    if (!meRes.ok) {
      return NextResponse.json({ success: true, data: [] });
    }
    const me = await meRes.json().catch(() => ({}));
    const dto = me?.data ?? me ?? {};
    const patientId = String(
      dto.ehrPatientId ?? dto.ehr_patient_id ?? dto.mrn ?? dto.id ?? ''
    );
    if (!patientId) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 2) Fetch that patient's invoices from patient-pay.
    const invRes = await fetch(
      `${PATIENT_PAY_URL}/api/patient-pay/invoices/patient/${encodeURIComponent(patientId)}?page=0&size=100`,
      { headers: hdrs }
    );
    if (!invRes.ok) {
      return NextResponse.json({ success: true, data: [] });
    }
    const invData = await invRes.json().catch(() => ({}));
    const wrapped = invData?.data ?? invData;
    const list = Array.isArray(wrapped) ? wrapped : wrapped?.content ?? [];

    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error('Patient-pay invoices proxy error:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}
