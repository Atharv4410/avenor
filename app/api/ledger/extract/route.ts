import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthedBusiness, handleApiError, ApiError } from "@/lib/server/apiHelpers";
import { isGeminiConfigured } from "@/lib/env";
import { extractLedgerRowsFromImage } from "@/lib/ai/geminiExtraction";
import { matchCustomerName } from "@/lib/server/customerMatching";

const schema = z.object({ ledgerDocumentId: z.string().uuid() });

export async function POST(request: NextRequest) {
  try {
    const { supabase, businessId } = await requireAuthedBusiness();
    const { ledgerDocumentId } = schema.parse(await request.json());

    const { data: document, error: docError } = await supabase
      .from("ledger_documents")
      .select("*")
      .eq("id", ledgerDocumentId)
      .eq("business_id", businessId)
      .single();
    if (docError || !document) throw new ApiError(404, "Ledger document not found.");

    if (!isGeminiConfigured()) {
      return NextResponse.json({
        configured: false,
        message:
          "AI extraction is not configured for this deployment. Enter the transactions from this page manually below.",
      });
    }

    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("id, name, shop_name")
      .eq("business_id", businessId);
    if (customersError) throw customersError;

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("ledger-documents")
      .download(document.storage_path);
    if (downloadError || !fileBlob) throw new ApiError(500, "Could not retrieve the uploaded image.");

    const arrayBuffer = await fileBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mediaType = (fileBlob.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";

    await supabase.from("ledger_documents").update({ status: "processing" }).eq("id", ledgerDocumentId);

    try {
      const extraction = await extractLedgerRowsFromImage({
        imageBase64: base64,
        mediaType,
        knownCustomerNames: (customers ?? []).map((c) => c.shop_name),
      });

      const customerRecords = (customers ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        shopName: c.shop_name,
      }));

      const rowsWithMatches = extraction.rows.map((row) => ({
        ...row,
        match: matchCustomerName(row.customerNameRaw, customerRecords),
      }));

      await supabase
        .from("ledger_documents")
        .update({ status: "extracted", extraction_result: extraction as any })
        .eq("id", ledgerDocumentId);

      return NextResponse.json({
        configured: true,
        model: extraction.model,
        pageNote: extraction.pageNote,
        rows: rowsWithMatches,
      });
    } catch (extractionError) {
      await supabase
        .from("ledger_documents")
        .update({
          status: "failed",
          error_message:
            extractionError instanceof Error ? extractionError.message : "Extraction failed.",
        })
        .eq("id", ledgerDocumentId);

      throw new ApiError(
        502,
        "AI extraction failed — the image may be unclear. You can retry or enter the transactions manually."
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "A ledgerDocumentId is required." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
