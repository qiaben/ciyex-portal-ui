import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Authorization header missing' },
        { status: 401 }
      );
    }

    const hdrs: Record<string, string> = { 'Authorization': authHeader };
    const orgAlias = request.headers.get('x-org-alias');
    if (orgAlias) hdrs['X-Org-Alias'] = orgAlias;
    const tenantName = request.headers.get('x-tenant-name') || orgAlias;
    if (tenantName) hdrs['X-Tenant-Name'] = tenantName;

    // Forward the raw multipart body with its original Content-Type (includes boundary)
    const contentType = request.headers.get('content-type');
    if (contentType) hdrs['Content-Type'] = contentType;

    const body = await request.arrayBuffer();
    const response = await fetch(`${BACKEND_URL}/api/fhir/portal/documents/upload`, {
      method: 'POST',
      headers: hdrs,
      body: Buffer.from(body),
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Portal document upload proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
