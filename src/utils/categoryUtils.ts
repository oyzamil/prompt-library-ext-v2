import { CATEGORIES_STORAGE_KEY, BROWSER_STORAGE_KEY, DEFAULT_CATEGORIES, DEFAULT_CATEGORY_ID } from './constants';

/**
 * Get all categories
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const categories = await storage.getItem<Category[]>(`local:${CATEGORIES_STORAGE_KEY}`);
    return categories || [];
  } catch (error) {
    console.error('Failed to obtain classification:', error);
    return [];
  }
}

/**
 * Save category
 */
export async function saveCategories(categories: Category[]): Promise<void> {
  try {
    await storage.setItem<Category[]>(`local:${CATEGORIES_STORAGE_KEY}`, categories);
  } catch (error) {
    console.error('Failed to save category:', error);
    throw error;
  }
}

/**
 * Initialize default classification
 */
export async function initializeDefaultCategories(): Promise<void> {
  try {
    const existingCategories = await getCategories();

    if (existingCategories.length === 0) {
      await saveCategories(DEFAULT_CATEGORIES);
      console.log('Default category initialized');
    }
  } catch (error) {
    console.error('Failed to initialize default classification:', error);
  }
}

/**
 * Get classification by ID
 */
export async function getCategoryById(categoryId: string): Promise<Category | null> {
  try {
    const categories = await getCategories();
    return categories.find((cat) => cat.id === categoryId) || null;
  } catch (error) {
    console.error('Failed to obtain classification:', error);
    return null;
  }
}

/**
 * Add new category
 */
export async function addCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
  try {
    const categories = await getCategories();
    const newCategory: Category = {
      ...category,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    categories.push(newCategory);
    await saveCategories(categories);
    return newCategory;
  } catch (error) {
    console.error('Failed to add category:', error);
    throw error;
  }
}

/**
 * Update classification
 */
export async function updateCategory(categoryId: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<void> {
  try {
    const categories = await getCategories();
    const index = categories.findIndex((cat) => cat.id === categoryId);

    if (index === -1) {
      throw new Error('Category does not exist');
    }

    categories[index] = {
      ...categories[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await saveCategories(categories);
  } catch (error) {
    console.error('Failed to update category:', error);
    throw error;
  }
}

/**
 * Delete the category (move the prompt words under it to the default category)
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  try {
    if (categoryId === DEFAULT_CATEGORY_ID) {
      throw new Error('Cannot delete default categories');
    }

    // Get all categories
    const categories = await getCategories();
    const categoryIndex = categories.findIndex((cat) => cat.id === categoryId);

    if (categoryIndex === -1) {
      throw new Error('Category does not exist');
    }

    // Get all prompt words and move the prompt words belonging to this category to the default category
    const prompts = (await storage.getItem<PromptItem[]>(`local:${BROWSER_STORAGE_KEY}`)) || [];
    const updatedPrompts = prompts.map((prompt) => (prompt.categoryId === categoryId ? { ...prompt, categoryId: DEFAULT_CATEGORY_ID } : prompt));

    //Save the updated prompt word
    await storage.setItem<PromptItem[]>(`local:${BROWSER_STORAGE_KEY}`, updatedPrompts);

    // Delete category
    categories.splice(categoryIndex, 1);
    await saveCategories(categories);
  } catch (error) {
    console.error('Failed to delete category:', error);
    throw error;
  }
}

/**
 * Migrate old data: add default category ID for prompt words without category ID
 */
export async function migratePromptsWithCategory(): Promise<void> {
  try {
    // First make sure there is a default category
    await initializeDefaultCategories();

    // Get all prompt words
    const prompts = (await storage.getItem<PromptItem[]>(`local:${BROWSER_STORAGE_KEY}`)) || [];

    // Check if there is data that needs to be migrated
    const needMigration = prompts.some((prompt) => !prompt.categoryId || prompt.sortOrder === undefined);

    if (needMigration) {
      const migratedPrompts = prompts.map((prompt, index) => ({
        ...prompt,
        categoryId: prompt.categoryId || DEFAULT_CATEGORY_ID,
        sortOrder: prompt.sortOrder !== undefined ? prompt.sortOrder : index,
      }));

      await storage.setItem<PromptItem[]>(`local:${BROWSER_STORAGE_KEY}`, migratedPrompts);
      console.log('Migration of prompt word classification and sorting has been completed');
    }
  } catch (error) {
    console.error('Migration prompt word classification failed:', error);
  }
}

/**
 * Get the number of prompt words under the specified category
 */
export async function getPromptCountByCategory(categoryId: string): Promise<number> {
  try {
    const prompts = (await storage.getItem<PromptItem[]>(`local:${BROWSER_STORAGE_KEY}`)) || [];
    return prompts.filter((prompt) => prompt.categoryId === categoryId).length;
  } catch (error) {
    console.error('Failed to obtain the number of prompt words under category:', error);
    return 0;
  }
}
