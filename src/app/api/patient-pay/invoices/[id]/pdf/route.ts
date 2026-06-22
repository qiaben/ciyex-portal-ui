import { NextRequest, NextResponse } from 'next/server';

const PATIENT_PAY_URL =
  process.env.PATIENT_PAY_URL ||
  process.env.NEXT_PUBLIC_PATIENT_PAY_URL ||
  'http://localhost:8086';

/**
 * Stream a patient's invoice statement PDF from ciyex-patient-pay.
 * Forwards the patient's bearer token + org alias so patient-pay can authorize
 * and scope the invoice to the caller's org.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Authorization header required' },
        { status: 401 }
      );
    }

    const hdrs: Record<string, string> = { Authorization: authHeader };
    const orgAlias = request.headers.get('x-org-alias');
    if (orgAlias) hdrs['X-Org-Alias'] = orgAlias;

    const upstream = await fetch(
      `${PATIENT_PAY_URL}/api/patient-pay/invoices/${encodeURIComponent(id)}/pdf`,
      { method: 'GET', headers: hdrs }
    );

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, message: `Invoice PDF unavailable (${upstream.status})` },
        { status: upstream.status }
      );
    }

    const pdf = await upstream.arrayBuffer();
    const disposition =
      upstream.headers.get('content-disposition') ||
      `attachment; filename="Invoice-${id}.pdf"`;

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Invoice PDF proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Invoice PDF service unavailable' },
      { status: 500 }
    );
  }
}
