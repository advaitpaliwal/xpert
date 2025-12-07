"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Check, X } from "lucide-react";
import Image from "next/image";
import { useQuiz } from "@/hooks/use-quiz";
import { useExpertise } from "@/hooks/use-expertise";
import { useTopicImage } from "@/hooks/use-topic-image";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function QuizPage({
  params,
}: {
  params: Promise<{ id: string; expertiseId: string; quizId: string }>;
}) {
  const { id, expertiseId, quizId } = use(params);
  const router = useRouter();

  const expertise = useExpertise(id);
  const expertiseTopic = expertise?.find((t) => t.id === expertiseId);

  const { imageUrl } = useTopicImage(
    expertiseTopic?.imagePrompt || "",
    expertiseTopic?.id || ""
  );

  const { quiz, loading } = useQuiz({
    id,
    expertiseId,
    quizId,
    expertiseTopic,
    quizTopic: expertiseTopic,
  });

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Initialize selected answers array when quiz loads
  if (quiz && selectedAnswers.length === 0) {
    setSelectedAnswers(new Array(quiz.questions.length).fill(null));
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (selectedAnswer !== null) return; // Prevent changing answer once selected

    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (answer === quiz.questions[index].correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  const allAnswered = selectedAnswers.every((answer) => answer !== null);
  const progress = quiz ? ((currentQuestion + 1) / quiz.questions.length) * 100 : 0;

  if (loading || !quiz) {
    return (
      <main className="relative min-h-screen flex flex-col pt-20 px-4 pb-20 font-sans">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="fixed top-4 left-4 z-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="max-w-3xl mx-auto w-full">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </main>
    );
  }

  const currentQ = quiz.questions[currentQuestion];
  const selectedAnswer = selectedAnswers[currentQuestion];
  const isCorrect = selectedAnswer === currentQ.correctAnswer;

  return (
    <main className="relative min-h-screen flex flex-col pt-20 px-4 pb-20 font-sans">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="fixed top-4 left-4 z-50"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="max-w-3xl mx-auto w-full space-y-8">
        {/* Header */}
        <header className="space-y-4">
          {imageUrl && (
            <div className="w-full aspect-[21/9] rounded-xl overflow-hidden relative">
              <Image
                src={imageUrl}
                alt={expertiseTopic?.title || ""}
                fill
                className="object-cover"
              />
            </div>
          )}
          <h1 className="text-4xl font-bold">Quiz: {expertiseTopic?.title}</h1>
          <p className="text-lg text-muted-foreground">Test your knowledge of {expertiseTopic?.title} with interactive multiple choice questions</p>
        </header>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Results Summary */}
        {showResults && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold">
                  Quiz Complete!
                </h2>
                <div className="text-5xl font-bold text-primary">
                  {calculateScore()} / {quiz.questions.length}
                </div>
                <p className="text-lg text-muted-foreground">
                  You got {Math.round((calculateScore() / quiz.questions.length) * 100)}% correct
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question Card */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            <h2 className="text-2xl font-semibold">{currentQ.question}</h2>

            <div className="space-y-3">
              {currentQ.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrectAnswer = index === currentQ.correctAnswer;
                const hasAnswered = selectedAnswer !== null;

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={hasAnswered}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border-2 transition-all",
                      "hover:border-primary disabled:cursor-not-allowed",
                      isSelected && !hasAnswered && "border-primary bg-primary/5",
                      hasAnswered && isCorrectAnswer && "border-green-500 bg-green-500/10",
                      hasAnswered && isSelected && !isCorrect && "border-red-500 bg-red-500/10",
                      !isSelected && !hasAnswered && "border-border"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex-1">{option}</span>
                      {hasAnswered && isCorrectAnswer && (
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 ml-2" />
                      )}
                      {hasAnswered && isSelected && !isCorrect && (
                        <X className="h-5 w-5 text-red-500 flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explanation (shown immediately after answering) */}
            {selectedAnswer !== null && (
              <div className={cn(
                "p-4 rounded-lg",
                isCorrect ? "bg-green-500/10 border border-green-500" : "bg-blue-500/10 border border-blue-500"
              )}>
                <p className="font-semibold mb-2">
                  {isCorrect ? "Correct!" : "Explanation:"}
                </p>
                <p className="text-sm">{currentQ.explanation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {quiz.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all",
                  index === currentQuestion && "border-primary bg-primary text-primary-foreground",
                  index !== currentQuestion && selectedAnswers[index] !== null && "bg-primary/20 border-primary/50",
                  index !== currentQuestion && selectedAnswers[index] === null && "border-border"
                )}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestion === quiz.questions.length - 1 && !showResults ? (
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered}
            >
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={currentQuestion === quiz.questions.length - 1}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
