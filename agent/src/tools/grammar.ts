import { llm } from '@livekit/agents';
import { z } from 'zod';

export interface GrammarError {
  original: string;
  corrected: string;
  explanation: string;
}

export function createGrammarTool(errors: GrammarError[]) {
  return llm.tool({
    description:
      'Flag a grammar error the student made during conversation. Call this silently whenever you notice incorrect grammar.',
    parameters: z.object({
      original: z.string().describe('What the student actually said'),
      corrected: z.string().describe('The grammatically correct version'),
      explanation: z.string().describe('Brief, simple explanation of the error'),
    }),
    execute: async ({ original, corrected, explanation }) => {
      errors.push({ original, corrected, explanation });
      return `Noted grammar correction: "${original}" → "${corrected}"`;
    },
  });
}
