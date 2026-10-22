import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { requireAuthedBusiness, handleApiError, ApiError } from "@/lib/server/apiHelpers";
import { hashBuffer } from "@/lib/idempotency";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  try {
    const { supabase, businessId, userId } = await requireAuthedBusiness();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ApiError(400, "No file provided.");
    }
    if (!ALLOWED_TYPES[file.type]) {
      throw new ApiError(400, "Only JPEG, PNG, or WEBP images are accepted.");
    }
    if (file.size > MAX_BYTES) {
      throw new ApiError(400, "Image is too large (max 10MB).");
    }
    if (file.size === 0) {
      throw new ApiError(400, "The uploaded file is empty.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const idempotencyKey = hashBuffer(Buffer.concat([Buffer.from(businessId), buffer]));

    const { data: existing } = await supabase
      .from("ledger_documents")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ledgerDocument: existing, deduplicated: true });
    }

    const ext = ALLOWED_TYPES[file.type];
    const storagePath = `${businessId}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("ledger-documents")
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) throw uploadError;

    const { data: document, error: insertError } = await supabase
      .from("ledger_documents")
      .insert({
        business_id: businessId,
        storage_path: storagePath,
        uploaded_by: userId,
        status: "uploaded",
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ ledgerDocument: document, deduplicated: false }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
