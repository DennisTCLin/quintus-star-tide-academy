import { expect, it } from "vitest";
import { GRADE4_STEPPED_MATH } from "../grade4-stepped-math";

it("matches the snack-bundle word problem to its two calculation steps", () => {
  const question = GRADE4_STEPPED_MATH.find(q => q.id === "g4-step-mixed-bracket1")!;
  const amounts = question.prompt.match(/每份點心有一個 (\d+) 元的麵包和一杯 (\d+) 元的果汁，買 (\d+) 份點心共需多少元/);
  expect(amounts).not.toBeNull();
  const [, bread, juice, bundles] = amounts!.map(Number);
  const subtotal = bread + juice;
  const total = subtotal * bundles;
  expect(question.steps?.map(step => step.fields?.map(field => field.answer))).toEqual([
    [String(subtotal)], [String(total)],
  ]);
  expect(question.options[question.answer].text).toBe(String(total));
  expect(question.explanation).toBe(`(${bread} + ${juice}) × ${bundles} = ${total}`);
});
