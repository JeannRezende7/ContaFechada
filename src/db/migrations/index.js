import { migration001Initial } from './001_initial.js';
import { migration002ConflictLog } from './002_conflict_log.js';
import { migration003LocalDocuments } from './003_local_documents.js';

/** Ordem de aplicação — sempre por `version` crescente, nunca reordenar. */
export const migrations = [migration001Initial, migration002ConflictLog, migration003LocalDocuments];
