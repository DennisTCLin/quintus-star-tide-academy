import type { ReactNode } from 'react';

/** Reading assistance belongs to grades 1–2; animation/music controls are separate. */
export function allowsReadAloud(grade: number): boolean {
  return grade === 1 || grade === 2;
}

export default function ReadAloud({ grade, children }: { grade: number; children: ReactNode }) {
  return allowsReadAloud(grade) ? <>{children}</> : null;
}
