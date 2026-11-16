import type {ReactNode} from 'react';
import {annotateTree} from './readability';
// Interface labels stay compact; phonetic learning content is rendered separately.
export function readyReading(node:ReactNode,grade:number):ReactNode { return annotateTree(node,grade); }
