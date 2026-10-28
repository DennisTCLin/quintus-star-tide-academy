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
  const [fieldValues, setFieldValues] = useState<string[][]>(() =>
    steps.map((s) => (s.fields ?? []).map(() => "")),
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

  const advanceToNext = useCallback(
    (stepIndex: number) => {
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
    },
    [steps.length, scrollToStep, onComplete],
  );

  const markCorrect = useCallback(
    (stepIndex: number, step: QuestionStep) => {
      setFeedback(null);
      setShowCorrectText(step.onCorrectText ?? null);
      setStepStates((prev) => {
        const next = [...prev];
        next[stepIndex] = "correct";
        if (stepIndex + 1 < steps.length) next[stepIndex + 1] = "active";
        return next;
      });
      advanceToNext(stepIndex);
    },
    [steps.length, advanceToNext],
  );

  const markWrong = useCallback(
    (stepIndex: number, step: QuestionStep, fbText?: string) => {
      hadWrong.current = true;
      setWrongCounts((prev) => {
        const next = [...prev];
        next[stepIndex]++;
        return next;
      });
      setFeedback(fbText ?? step.wrongFeedback ?? step.hint ?? "再想想看，仔細看題目的條件。");
      setShowCorrectText(null);
      setStepStates((prev) => {
        const next = [...prev];
        next[stepIndex] = "wrong";
        return next;
      });
      setTimeout(() => {
        setStepStates((prev) => {
          const next = [...prev];
          next[stepIndex] = "active";
          return next;
        });
        setFeedback(null);
      }, 1600);
    },
    [],
  );

  const handleMcqSelect = useCallback(
    (stepIndex: number, optionIndex: number) => {
      if (disabled || completed || stepStates[stepIndex] !== "active") return;
      const step = steps[stepIndex];
      setSelected((prev) => {
        const next = [...prev];
        next[stepIndex] = optionIndex;
        return next;
      });
      if (optionIndex === step.answer) {
        markCorrect(stepIndex, step);
      } else {
        const option = step.options?.[optionIndex];
        markWrong(stepIndex, step, option?.wrongFeedback);
        setTimeout(() => {
          setSelected((prev) => {
            const next = [...prev];
            next[stepIndex] = null;
            return next;
          });
        }, 1600);
      }
    },
    [disabled, completed, stepStates, steps, markCorrect, markWrong],
  );

  const handleInputSubmit = useCallback(
    (stepIndex: number) => {
      if (disabled || completed || stepStates[stepIndex] !== "active") return;
      const step = steps[stepIndex];
      const fields = step.fields ?? [];
      const values = fieldValues[stepIndex];
      const allCorrect = fields.every(
        (f, i) => values[i]?.trim() === f.answer,
      );
      if (allCorrect) {
        markCorrect(stepIndex, step);
      } else {
        markWrong(stepIndex, step);
      }
    },
    [disabled, completed, stepStates, steps, fieldValues, markCorrect, markWrong],
  );

  const setFieldValue = useCallback(
    (stepIndex: number, fieldIndex: number, value: string) => {
      setFieldValues((prev) => {
        const next = prev.map((row) => [...row]);
        next[stepIndex][fieldIndex] = value;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    setCurrentStep(0);
    setStepStates(steps.map((_, i) => (i === 0 ? "active" : "locked")));
    setSelected(steps.map(() => null));
    setFieldValues(steps.map((s) => (s.fields ?? []).map(() => "")));
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

      <div
        className="stepped-progress"
        role="progressbar"
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
            fieldValues={fieldValues[stepIndex]}
            wrongCount={wrongCounts[stepIndex]}
            disabled={disabled}
            feedback={stepIndex === currentStep ? feedback : null}
            correctText={stepIndex === currentStep ? showCorrectText : null}
            onMcqSelect={(optionIndex) => handleMcqSelect(stepIndex, optionIndex)}
            onInputSubmit={() => handleInputSubmit(stepIndex)}
            onFieldChange={(fi, val) => setFieldValue(stepIndex, fi, val)}
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
  fieldValues,
  wrongCount,
  disabled,
  feedback,
  correctText,
  onMcqSelect,
  onInputSubmit,
  onFieldChange,
}: {
  step: QuestionStep;
  stepIndex: number;
  totalSteps: number;
  state: StepState;
  selectedOption: number | null;
  fieldValues: string[];
  wrongCount: number;
  disabled: boolean;
  feedback: string | null;
  correctText: string | null;
  onMcqSelect: (optionIndex: number) => void;
  onInputSubmit: () => void;
  onFieldChange: (fieldIndex: number, value: string) => void;
}) {
  const mode = step.mode ?? "mcq";
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state === "active" && mode === "input") {
      setTimeout(() => firstInputRef.current?.focus(), 450);
    }
  }, [state, mode]);

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

      {state !== "locked" && mode === "mcq" && step.options && (
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
              onClick={() => onMcqSelect(i)}
              aria-label={`選項 ${i + 1}：${option.text}`}
            >
              <PhoneticText text={option.text} />
            </button>
          ))}
        </div>
      )}

      {state !== "locked" && mode === "input" && step.fields && (
        <div className="step-input-row">
          {step.template ? (
            <TemplateFields
              template={step.template}
              fields={step.fields}
              values={fieldValues}
              disabled={disabled || state === "correct"}
              state={state}
              firstInputRef={firstInputRef}
              onChange={onFieldChange}
              onSubmit={onInputSubmit}
            />
          ) : (
            step.fields.map((field, fi) => (
              <input
                key={fi}
                ref={fi === 0 ? firstInputRef : undefined}
                type="text"
                inputMode="numeric"
                pattern="[0-9/⋯]*"
                placeholder={field.label ?? "?"}
                value={state === "correct" ? field.answer : fieldValues[fi]}
                disabled={disabled || state === "correct"}
                className={`step-input step-input-${field.width ?? "medium"} ${
                  state === "wrong" ? "step-input-wrong" : ""
                } ${state === "correct" ? "step-input-correct" : ""}`}
                onChange={(e) => onFieldChange(fi, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onInputSubmit();
                }}
                aria-label={field.label ?? `填入答案 ${fi + 1}`}
              />
            ))
          )}
          {state === "active" && (
            <button
              type="button"
              className="step-submit"
              disabled={disabled || fieldValues.some((v) => !v.trim())}
              onClick={onInputSubmit}
            >
              確認
            </button>
          )}
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

function TemplateFields({
  template,
  fields,
  values,
  disabled,
  state,
  firstInputRef,
  onChange,
  onSubmit,
}: {
  template: string;
  fields: { label?: string; answer: string; width?: "short" | "medium" | "long" }[];
  values: string[];
  disabled: boolean;
  state: StepState;
  firstInputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (fi: number, val: string) => void;
  onSubmit: () => void;
}) {
  const parts = template.split(/(\{[0-9]+\})/);
  let inputCount = 0;

  return (
    <span className="step-template">
      {parts.map((part, pi) => {
        const match = part.match(/^\{([0-9]+)\}$/);
        if (match) {
          const fi = Number(match[1]);
          const field = fields[fi];
          if (!field) return null;
          const idx = inputCount++;
          return (
            <input
              key={pi}
              ref={idx === 0 ? firstInputRef : undefined}
              type="text"
              inputMode="numeric"
              pattern="[0-9/⋯]*"
              placeholder={field.label ?? "?"}
              value={state === "correct" ? field.answer : values[fi]}
              disabled={disabled}
              className={`step-input step-input-${field.width ?? "medium"} ${
                state === "wrong" ? "step-input-wrong" : ""
              } ${state === "correct" ? "step-input-correct" : ""}`}
              onChange={(e) => onChange(fi, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit();
              }}
              aria-label={field.label ?? `填入答案`}
            />
          );
        }
        return <span key={pi} className="step-template-text">{part}</span>;
      })}
    </span>
  );
}
