import { NextRequest, NextResponse } from "next/server";
import { createSandbox, killSandbox } from "@/server/lib/sandbox";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function DELETE(req: NextRequest) {
  try {
    const { sandboxId } = await req.json();
    if (!sandboxId) {
      return new NextResponse("Missing sandboxId", {
        status: 400,
        headers: corsHeaders,
      });
    }
    killSandbox(sandboxId).catch(console.error);
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || String(e) },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const e2bApiKey = process.env.E2B_API_KEY;
    if (!e2bApiKey) {
      return NextResponse.json(
        { error: "Server Configuration Error: E2B API Key is missing." },
        { status: 500, headers: corsHeaders }
      );
    }

    const { fragmentId } = await req.json();
    if (!fragmentId) {
      return NextResponse.json(
        { error: "Missing fragmentId" },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await createSandbox(fragmentId, e2bApiKey);
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Sandbox provisioning failed:", error);
    return NextResponse.json(
      { error: error.message || String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
