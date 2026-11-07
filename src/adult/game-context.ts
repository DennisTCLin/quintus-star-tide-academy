import {createContext} from 'react';
import type {AdultCloud} from './cloud';
export const AdultGameContext=createContext<{learning:AdultCloud}|null>(null);
