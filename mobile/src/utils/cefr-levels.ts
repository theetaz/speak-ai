import { type CEFRLevel } from './constants';

interface CEFRInfo {
  level: CEFRLevel;
  name: string;
  description: string;
  examples: string;
}

export const CEFR_INFO: Record<CEFRLevel, CEFRInfo> = {
  A1: {
    level: 'A1',
    name: 'Beginner',
    description: 'Can understand and use basic everyday expressions.',
    examples: 'Introducing yourself, ordering food, asking for directions.',
  },
  A2: {
    level: 'A2',
    name: 'Elementary',
    description: 'Can communicate in simple, routine tasks.',
    examples: 'Shopping, describing your background, simple conversations.',
  },
  B1: {
    level: 'B1',
    name: 'Intermediate',
    description: 'Can deal with most situations while traveling.',
    examples: 'Expressing opinions, describing experiences, making plans.',
  },
  B2: {
    level: 'B2',
    name: 'Upper Intermediate',
    description: 'Can interact with native speakers fluently.',
    examples: 'Debating topics, understanding complex texts, professional communication.',
  },
  C1: {
    level: 'C1',
    name: 'Advanced',
    description: 'Can express ideas fluently and spontaneously.',
    examples: 'Academic discussions, nuanced arguments, complex professional tasks.',
  },
  C2: {
    level: 'C2',
    name: 'Proficient',
    description: 'Can understand virtually everything heard or read.',
    examples: 'Near-native fluency, subtle humor, complex idioms.',
  },
};
