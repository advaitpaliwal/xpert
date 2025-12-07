import { z } from "zod";

export const TopicSchema = z.object({
  title: z.string().describe("Short, catchy title for the expertise area"),
  description: z.string().describe("Brief description of what this expertise covers"),
  imagePrompt: z.string().describe("A stylistic, artistic image prompt that visually represents this topic, could be used for a cover image for a course or podcast"),
});

export const TopicsSchema = z
  .array(TopicSchema)
  .length(4)
  .describe("Exactly 4 broad expertise topics the person is likely an expert at");

export const TopicsWithProfileSchema = z.object({
  profileDescription: z
    .string()
    .describe("A fun, quirky, punchy descriptor for who this person is - be creative and playful"),
  topics: TopicsSchema,
});

export const ContentTopicsSchema = z.object({
  reading: z
    .array(TopicSchema)
    .length(2)
    .describe("Exactly 2 reading topics related to the main topic"),
  audio: z
    .array(TopicSchema)
    .length(2)
    .describe("Exactly 2 audio/podcast topics related to the main topic"),
  video: TopicSchema.describe("1 video topic related to the main topic"),
});

export type Topic = {
  id: string;
  title: string;
  description: string;
  imagePrompt: string;
  imageUrl?: string;
};

export type Topics = Topic[];

export type ContentTopics = {
  reading: Topics;
  audio: Topics;
  video: Topic;
};

export const QuizQuestionSchema = z.object({
  question: z.string().describe("The question text"),
  options: z.array(z.string()).length(4).describe("Exactly 4 answer options"),
  correctAnswer: z.number().min(0).max(3).describe("Index of the correct answer (0-3)"),
  explanation: z.string().describe("Brief explanation of why the correct answer is right"),
});

export const QuizSchema = z.object({
  questions: z
    .array(QuizQuestionSchema)
    .min(8)
    .max(12)
    .describe("8-12 multiple choice questions progressing from basic to advanced"),
});

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;

export const MindmapSchema = z.object({
  markdown: z.string().describe("Markdown formatted mindmap content using headers (#, ##, ###) and lists (-, *) to represent hierarchy"),
});

export type Mindmap = z.infer<typeof MindmapSchema>;

export function generateId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const randomPart =
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().split("-")[0]
      : Math.random().toString(36).slice(2, 8)) || "topic";

  return slug ? `${slug}-${randomPart}` : randomPart;
}
