import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthedBusiness, handleApiError } from "@/lib/server/apiHelpers";
import { listCustomersWithAccounting, createCustomer } from "@/lib/server/customers";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  shopName: z.string().min(1).max(200),
  phone: z.string().max(30).default(""),
  paymentTermsDays: z.number().int().positive().nullable().optional(),
});

export async function GET() {
  try {
    const { supabase, businessId } = await requireAuthedBusiness();
    const asOf = new Date().toISOString().slice(0, 10);
    const customers = await listCustomersWithAccounting(supabase, businessId, asOf);
    return NextResponse.json({ customers });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, businessId } = await requireAuthedBusiness();
    const body = createSchema.parse(await request.json());
    const customer = await createCustomer(supabase, businessId, body);
    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
