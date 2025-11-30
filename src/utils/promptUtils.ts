function hashString(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; //Convert to 32-bit integer
  }
  return Math.abs(hash); // Make sure it is a positive number
}

/**
 * Generates a unique ID for a prompt based on its title, content, and tags.
 * Ensures the ID starts with 'p' to be a valid selector.
 * @param title The title of the prompt.
 * @param content The content of the prompt.
 * @param tags Optional array of tags.
 * @returns A unique string ID for the prompt.
 */
export function generatePromptId(title: string, content: string, tags?: string[]): string {
  let uniqueString = `${title.trim()}::${content.trim()}`;
  if (tags && tags.length > 0) {
    const sortedTags = [...tags].sort();
    uniqueString += `::${sortedTags.join(',')}`;
  }
  const hash = hashString(uniqueString);
  const hashStr = hash.toString(36);
  // Add prefix p to ensure IDs always start with a letter, avoiding potential CSS selector issues or HTML ID issues
  return `p${hashStr}`;
}
