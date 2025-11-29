/**
 * Parse the variables in the prompt word content
 * The variable format is {{variable name}}
 */

// Regular expression used to match variables in the format {{variable name}}
const variableRegex = /\{\{([^{}]+)\}\}/g;

/**
 * Extract variables from the prompt word content
 * @param content Prompt word content
 * @returns extracted variable array
 */
export function extractVariables(content: string): string[] {
  if (!content) return [];

  const variables: string[] = [];
  let match;

  // Use regular expression to match all variables
  while ((match = variableRegex.exec(content)) !== null) {
    // match[1] is the variable name (without brackets)
    if (match[1] && !variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}

/**
 * Replace variables in prompt word content
 * @param content Prompt word content
 * @param variableValues ​​mapping of variable names and values
 * @returns the content after replacing the variable
 */
export function replaceVariables(content: string, variableValues: Record<string, string>): string {
  if (!content) return '';

  //Replace all variables
  return content.replace(variableRegex, (match, varName) => {
    // If a variable value is provided, replace it; otherwise leave it as is
    return variableValues[varName] !== undefined ? variableValues[varName] : match;
  });
}
