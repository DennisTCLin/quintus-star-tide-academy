import { useCallback, useEffect, useRef, useState } from "react";
import type { LearningQuestion, QuestionStep } from "./learning";
import { PhoneticText } from "./PhoneticText";
import "./stepped-question.css";

type StepState = "locked" | "active" | "correct" | "wrong";

export default function SteppedQuestion({
  question,
  disabled,
  onComplete,
}: {
  question: LearningQuestion;
  disabled: boolean;
  onComplete: (allCorrectFirstTry: boolean) => void;
}) {
  const steps = question.steps!;
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStates, setStepStates] = useState<StepState[]>(() =>
    steps.map((_, i) => (i === 0 ? "active" : "locked")),
  );
  const [selected, setSelected] = useState<(number | null)[]>(() =>
    steps.map(() => null),
  );
  const [wrongCounts, setWrongCounts] = useState<number[]>(() =>
    steps.map(() => 0),
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showCorrectText, setShowCorrectText] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const hadWrong = useRef(false);
  const stepsRef = useRef<HTMLDivElement>(null);

  const scrollToStep = useCallback((stepIndex: number) => {
    requestAnimationFrame(() => {
      const el = stepsRef.current?.querySelector(
        `[data-step="${stepIndex}"]`,
      ) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const handleSelect = useCallback(
    (stepIndex: number, optionIndex: number) => {
      if (disabled || completed || stepStates[stepIndex] !== "active") return;

      const step = steps[stepIndex];
      const isCorrect = optionIndex === step.answer;

      setSelected((prev) => {
        const next = [...prev];
        next[stepIndex] = optionIndex;
        return next;
      });

      if (isCorrect) {
        setFeedback(null);
        setShowCorrectText(step.onCorrectText ?? null);
        setStepStates((prev) => {
          const next = [...prev];
          next[stepIndex] = "correct";
          if (stepIndex + 1 < steps.length) {
            next[stepIndex + 1] = "active";
          }
          return next;
        });

        if (stepIndex + 1 < steps.length) {
          setCurrentStep(stepIndex + 1);
          setTimeout(() => {
            setShowCorrectText(null);
            scrollToStep(stepIndex + 1);
          }, 800);
        } else {
          setCompleted(true);
          setTimeout(() => setShowCorrectText(null), 1200);
          onComplete(!hadWrong.current);
        }
      } else {
        hadWrong.current = true;
        setWrongCounts((prev) => {
          const next = [...prev];
          next[stepIndex]++;
          return next;
        });

        const option = step.options[optionIndex];
        const fb =
          option.wrongFeedback ??
          step.hint ??
          "再想想看，仔細看題目的條件。";
        setFeedback(fb);
        setShowCorrectText(null);

        setStepStates((prev) => {
          const next = [...prev];
          next[stepIndex] = "wrong";
          return next;
        });

        setTimeout(() => {
          setSelected((prev) => {
            const next = [...prev];
            next[stepIndex] = null;
            return next;
          });
          setStepStates((prev) => {
            const next = [...prev];
            next[stepIndex] = "active";
            return next;
          });
          setFeedback(null);
        }, 1600);
      }
    },
    [disabled, completed, stepStates, steps, scrollToStep, onComplete],
  );

  useEffect(() => {
    setCurrentStep(0);
    setStepStates(steps.map((_, i) => (i === 0 ? "active" : "locked")));
    setSelected(steps.map(() => null));
    setWrongCounts(steps.map(() => 0));
    setFeedback(null);
    setShowCorrectText(null);
    setCompleted(false);
    hadWrong.current = false;
  }, [question.id]);

  return (
    <div className="stepped-question" ref={stepsRef}>
      <div className="stepped-stem">
        <PhoneticText text={question.prompt} />
      </div>

      <div className="stepped-progress" role="progressbar"
        aria-valuenow={stepStates.filter((s) => s === "correct").length}
        aria-valuemax={steps.length}
        aria-label="解題步驟進度"
      >
        {steps.map((_, i) => (
          <span
            key={i}
            className={`stepped-dot ${stepStates[i]}`}
            aria-label={`步驟 ${i + 1}：${stepStates[i] === "correct" ? "完成" : stepStates[i] === "active" ? "進行中" : "尚未解鎖"}`}
          />
        ))}
      </div>

      <div className="stepped-steps">
        {steps.map((step, stepIndex) => (
          <StepCard
            key={stepIndex}
            step={step}
            stepIndex={stepIndex}
            totalSteps={steps.length}
            state={stepStates[stepIndex]}
            selectedOption={selected[stepIndex]}
            wrongCount={wrongCounts[stepIndex]}
            disabled={disabled}
            feedback={stepIndex === currentStep ? feedback : null}
            correctText={stepIndex === currentStep ? showCorrectText : null}
            onSelect={(optionIndex) => handleSelect(stepIndex, optionIndex)}
          />
        ))}
      </div>

      {completed && (
        <div className="stepped-completion" role="status">
          <span className="stepped-completion-icon">✦</span>
          <p>
            {question.completionText ??
              (hadWrong.current
                ? "完成了！下次試試一次就全對。"
                : "太棒了，全部一次答對！")}
          </p>
        </div>
      )}
    </div>
  );
}

function StepCard({
  step,
  stepIndex,
  totalSteps,
  state,
  selectedOption,
  wrongCount,
  disabled,
  feedback,
  correctText,
  onSelect,
}: {
  step: QuestionStep;
  stepIndex: number;
  totalSteps: number;
  state: StepState;
  selectedOption: number | null;
  wrongCount: number;
  disabled: boolean;
  feedback: string | null;
  correctText: string | null;
  onSelect: (optionIndex: number) => void;
}) {
  return (
    <div
      className={`step-card step-${state}`}
      data-step={stepIndex}
      aria-label={`步驟 ${stepIndex + 1}/${totalSteps}`}
    >
      <div className="step-header">
        <span className="step-number">
          {state === "correct" ? "✓" : stepIndex + 1}
        </span>
        <span className="step-prompt">
          <PhoneticText text={step.prompt} />
        </span>
      </div>

      {state !== "locked" && (
        <div className="step-options">
          {step.options.map((option, i) => (
            <button
              key={i}
              type="button"
              disabled={disabled || state === "correct" || state === "locked"}
              className={`step-option ${
                selectedOption === i
                  ? state === "correct"
                    ? "step-option-correct"
                    : state === "wrong"
                      ? "step-option-wrong"
                      : ""
                  : ""
              } ${state === "correct" && i === step.answer ? "step-option-correct" : ""}`}
              onClick={() => onSelect(i)}
              aria-label={`選項 ${i + 1}：${option.text}`}
            >
              <PhoneticText text={option.text} />
            </button>
          ))}
        </div>
      )}

      {feedback && state === "wrong" && (
        <div className="step-feedback step-feedback-wrong" role="alert">
          <span className="step-feedback-icon">💡</span>
          {feedback}
        </div>
      )}

      {correctText && state === "correct" && (
        <div className="step-feedback step-feedback-correct" role="status">
          <span className="step-feedback-icon">✓</span>
          {correctText}
        </div>
      )}

      {wrongCount >= 2 && state === "active" && step.hint && (
        <div className="step-hint">
          <span className="step-feedback-icon">🔎</span>
          {step.hint}
        </div>
      )}
    </div>
  );
}
