import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";

import { adminDb } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  const body = await request.json();

  // Handle both standard direct JSON payload and Vapi Tool Call Webhook payload
  let payload = body;
  if (
    body.message?.type === "tool-calls" &&
    body.message.toolWithToolCallList?.[0]?.toolCall?.function?.arguments
  ) {
    payload = {
      ...body.message.toolWithToolCallList[0].toolCall.function.arguments,
      // User ID might be passed as a tool argument or be in the call variables
      userid:
        body.message.toolWithToolCallList[0].toolCall.function.arguments
          .userid || body.message.call?.variableValues?.userid,
    };
  }

  const { type, role, level, techstack, amount, userid } = payload;

  try {
    // Validate required fields
    if (!techstack) {
      return new Response(JSON.stringify({ error: "techstack is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { text: questions } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]
        
        Thank you! <3
    `,
    });

    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: techstack.split(","),
      questions: JSON.parse(questions),
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection("interviews").add(interview);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ success: false, error: error }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
