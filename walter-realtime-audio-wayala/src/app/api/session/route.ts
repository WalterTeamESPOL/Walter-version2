import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // modificación en la versión
          session: {
          type: "realtime",
          model: "gpt-realtime-2",
             audio: {
                input: {
                 noise_reduction: {
                    type: "far_field",
                },
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.95,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 700,
                },
              },
            },
          },
        }),
      }
    );
    const data = await response.json();
    if (!response.ok){
      console.error("OPenAI error:", data);
      return NextResponse.json(data, {status: response.status});
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
