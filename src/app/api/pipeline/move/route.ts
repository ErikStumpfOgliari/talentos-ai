import { NextResponse } from "next/server";
import { movePipelineCandidate } from "@/app/pipeline/actions";

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const result = await movePipelineCandidate(input);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline update failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
