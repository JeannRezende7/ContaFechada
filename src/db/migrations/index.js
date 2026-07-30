import { migration001Initial } from './001_initial.js';

/** Ordem de aplicação — sempre por `version` crescente, nunca reordenar. */
export const migrations = [migration001Initial];
