import { PromptItem, Category } from './types';

export const BROWSER_STORAGE_KEY = 'userPrompts';
export const CATEGORIES_STORAGE_KEY = 'userCategories';

// Default category ID
export const DEFAULT_CATEGORY_ID = 'default';

/**
 * Default classification
 */
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: DEFAULT_CATEGORY_ID,
    name: 'default',
    description: 'System default classification, used to store unclassified prompt words',
    color: '#6366f1',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'programming',
    name: 'Programming development',
    description: 'Prompt words related to programming and code',
    color: '#10b981',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'painting',
    name: 'painting',
    description: 'Prompt words related to painting',
    color: '#f59e0b',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Default prompt example
 */
export const DEFAULT_PROMPTS: PromptItem[] = [
  {
    id: 'default-ghibli',
    title: 'Ghibli style',
    content: 'Convert pictures to Ghibli style',
    tags: ['Draw a picture', 'Ghibli'],
    enabled: true,
    categoryId: 'painting',
  },
  {
    id: 'default-code-explain',
    title: 'Code explanation',
    content: 'Please explain what the following code does and how it works:\n\n',
    tags: ['programming'],
    enabled: true,
    categoryId: 'programming',
  },
  {
    id: 'default-role-template',
    title: 'Develop roles',
    content: 'You are now a {{role}}, with {{years}} years of development experience and good at {{skills}}.',
    tags: ['programming', 'variable'],
    enabled: true,
    categoryId: 'programming',
  },
];
