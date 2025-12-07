import { NextRequest, NextResponse } from "next/server";
import { xai } from "@ai-sdk/xai";
import { generateObject } from "ai";
import { QuizSchema, type Quiz } from "@/lib/schemas";
import { tryFixAndParseJsonFromError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { username, expertiseTopic, expertiseDescription, quizTitle, quizDescription } = await request.json();

    if (!quizTitle || !quizDescription) {
      return NextResponse.json(
        { error: "Quiz title and description are required" },
        { status: 400 }
      );
    }

    const result = await generateObject({
      model: xai("grok-4-1-fast-non-reasoning"),
      schema: QuizSchema,
      system: "You are an expert quiz creator specializing in educational assessments. Create engaging, well-structured multiple choice questions that test understanding and critical thinking.",
      prompt: `Create a quiz about "${quizTitle}" for @${username}.

Context:
- This is part of their expertise in: ${expertiseTopic} - ${expertiseDescription}
- Quiz topic: ${quizTitle}
- Topic description: ${quizDescription}

Create a comprehensive quiz with 8-12 multiple choice questions that:
1. Progress from basic to advanced concepts
2. Test both factual knowledge and application/analysis
3. Include clear, unambiguous questions
4. Provide 4 answer options for each question
5. Have only ONE correct answer per question
6. Cover different aspects of the topic

Make questions challenging but fair. Avoid trick questions or overly obscure details. Focus on testing genuine understanding of the material.`,
    }).catch((error) => {
      const fixed = tryFixAndParseJsonFromError<Quiz>(error);
      if (fixed?.questions) {
        console.warn("Attempting to fix malformed JSON for quiz...");
        const validated = QuizSchema.safeParse(fixed);
        if (validated.success) {
          console.log("Successfully fixed malformed JSON");
          return { object: validated.data };
        }
      }
      throw error;
    });

    return NextResponse.json({ quiz: result.object });
  } catch (error) {
    console.error("Error generating quiz:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
