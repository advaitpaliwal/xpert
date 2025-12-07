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
  reading: TopicSchema.describe("1 reading topic related to the main topic"),
  audio: TopicSchema.describe("1 audio/podcast topic related to the main topic"),
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
  reading: Topic;
  audio: Topic;
  video: Topic;
};

export type TopicsWithProfile = z.infer<typeof TopicsWithProfileSchema>;

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

export const SlideSchema = z.object({
  title: z.string().describe("Short, clear title for this slide"),
  bullets: z.array(z.string()).min(2).max(5).describe("2-5 bullet points with key information (each bullet should be concise, 1-2 sentences)"),
  audioTranscript: z.string().describe("Natural speech transcript for what should be narrated for this slide (conversational tone, 20-30 seconds when spoken)"),
});

export const SlideshowSchema = z.object({
  slides: z
    .array(SlideSchema)
    .length(10)
    .describe("Exactly 10 slides that tell a cohesive story about the topic, progressing logically from introduction to conclusion"),
});

export type Slide = z.infer<typeof SlideSchema> & {
  id: string;
};

export type Slideshow = {
  slides: Slide[];
};

export const PodcastTurnSchema = z.object({
  speaker: z.enum(["host", "guest"]).describe("Which speaker is talking - either 'host' or 'guest'"),
  text: z.string().describe("What the speaker says in this turn - should be natural, conversational, and engaging (2-4 sentences)"),
});

export const PodcastScriptSchema = z.object({
  turns: z
    .array(PodcastTurnSchema)
    .min(8)
    .max(16)
    .describe("8-16 turns alternating between host and guest, creating a natural back-and-forth conversation"),
});

export type PodcastTurn = z.infer<typeof PodcastTurnSchema>;
export type PodcastScript = z.infer<typeof PodcastScriptSchema>;

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
