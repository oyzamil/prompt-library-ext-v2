//Storage the real title attribute name in Notion Database
let notionDatabaseTitlePropertyName: string = 'Title'; // Default is "Title"

//Add a function to get the name of the database title attribute
export const getNotionDatabaseTitlePropertyName = async (): Promise<string> => {
  // Since this value currently only exists in memory, return the variable directly
  // If persistence is needed in the future, consider storing it in storage
  return notionDatabaseTitlePropertyName;
};

// Get the saved Notion API key
export const getNotionApiKey = async (): Promise<string | null> => {
  try {
    const result = await browser.storage.sync.get('notionApiKey');
    return result.notionApiKey || null;
  } catch (error) {
    console.error('Error retrieving Notion API key:', error);
    return null;
  }
};

// Get the saved Notion database ID
export const getDatabaseId = async (): Promise<string | null> => {
  try {
    const result = await browser.storage.sync.get('notionDatabaseId');
    return result.notionDatabaseId || null;
  } catch (error) {
    console.error('Error retrieving Notion database ID:', error);
    return null;
  }
};

// Check whether Notion synchronization is enabled
export const isSyncEnabled = async (): Promise<boolean> => {
  try {
    const result = await browser.storage.sync.get(['notionSyncToNotionEnabled']);
    return !!result.notionSyncToNotionEnabled;
  } catch (error) {
    console.error('Error checking Notion sync status:', error);
    return false;
  }
};

interface NotionPageProperty {
  id: string;
  type: string;
  [key: string]: any; // Used for other attribute types, such as title, rich_text, etc.
}

interface NotionDatabaseSchema {
  properties: Record<string, NotionPageProperty>;
  //Add other schema-related fields if needed
}

interface NotionQueryResponse {
  results: any[];
  next_cursor?: string;
  //Add additional response fields if needed
}

// Get the structure information of the Notion database
export const fetchNotionDatabaseSchema = async (apiKey: string, databaseId: string): Promise<NotionDatabaseSchema | null> => {
  try {
    const response: Response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const errorData: any = await response.json();
      console.error(`Error fetching Notion database schema (${response.status}):`, errorData);
      throw new Error(`Failed to fetch database schema: ${errorData.message || response.status}`);
    }
    const schema: NotionDatabaseSchema = await response.json();

    // Try to find the name of a property of type 'title'
    let titlePropName = 'Title'; // default value
    if (schema && schema.properties) {
      for (const propName in schema.properties) {
        if (schema.properties[propName].type === 'title') {
          titlePropName = propName;
          break;
        }
      }
    }
    notionDatabaseTitlePropertyName = titlePropName; //Update global variables
    console.log('Successfully fetched Notion database schema. Title property name:', titlePropName);
    return schema;
  } catch (error) {
    console.error('Error in fetchNotionDatabaseSchema:', error);
    return null;
  }
};

// New: Check and update the database structure to ensure all required fields are present
export const ensureDatabaseStructure = async (apiKey: string, databaseId: string): Promise<boolean> => {
  try {
    //First get the current database structure
    const schema = await fetchNotionDatabaseSchema(apiKey, databaseId);
    if (!schema) {
      console.error('Cannot update database structure without schema');
      return false;
    }

    const properties = schema.properties || {};
    const requiredFields: { [key: string]: { type: string; options?: any } } = {
      // Note: The title field does not need to be added because the Notion database must have a title field
      Content: { type: 'rich_text' },
      Tags: { type: 'multi_select' },
      Enabled: { type: 'checkbox' },
      PromptID: { type: 'rich_text' },
      CategoryID: { type: 'rich_text' },
      Notes: { type: 'rich_text' },
      LastModified: { type: 'rich_text' },
    };

    // Determine which fields need to be added
    const missingFields: Record<string, any> = {};
    let hasMissingFields = false;

    for (const [fieldName, fieldConfig] of Object.entries(requiredFields)) {
      if (!properties[fieldName]) {
        console.log(`Field "${fieldName}" missing in database, will add it.`);
        missingFields[fieldName] = {
          [fieldConfig.type]: fieldConfig.options || {},
        };
        hasMissingFields = true;
      } else if (properties[fieldName].type !== fieldConfig.type) {
        console.warn(`Field "${fieldName}" exists but has wrong type: ${properties[fieldName].type} (expected: ${fieldConfig.type})`);
        //In actual applications, it may be necessary to add logic to handle type mismatches here
      }
    }

    // If there are no missing fields, return success directly.
    if (!hasMissingFields) {
      console.log('All required database fields are present.');
      return true;
    }

    //Update database to add missing fields
    console.log('Updating database structure to add missing fields:', Object.keys(missingFields));
    const updateResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: missingFields,
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('Failed to update database structure:', errorData);
      throw new Error(`Failed to update database: ${errorData.message || updateResponse.status}`);
    }

    const updatedSchema = await updateResponse.json();
    console.log('Successfully updated database structure. Added fields:', Object.keys(missingFields));
    return true;
  } catch (error) {
    console.error('Error ensuring database structure:', error);
    return false;
  }
};

// Get all Prompts from Notion database
// Return an array of PromptItems or null on error
export const fetchNotionPrompts = async (apiKey: string, databaseId: string): Promise<PromptItem[] | null> => {
  try {
    const schema = await fetchNotionDatabaseSchema(apiKey, databaseId);
    if (!schema) {
      console.error('Cannot fetch Notion prompts without database schema.');
      return null;
    }
    const titlePropName = notionDatabaseTitlePropertyName;

    let allResults: any[] = [];
    let nextCursor: string | undefined = undefined;

    do {
      const response: Response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ start_cursor: nextCursor }),
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        console.error('Error querying Notion database:', errorData);
        throw new Error(`Failed to query database: ${errorData.message || response.status}`);
      }

      const data: NotionQueryResponse = await response.json();
      allResults = allResults.concat(data.results);
      nextCursor = data.next_cursor;
    } while (nextCursor);

    console.log(`Fetched ${allResults.length} pages from Notion.`);

    return allResults.map((page: any) => {
      const props = page.properties;
      const title = props[titlePropName]?.title?.[0]?.plain_text?.trim() || 'Untitled';
      const content = props.Content?.rich_text?.[0]?.plain_text?.trim() || '';
      const tags = props.Tags?.multi_select?.map((tag: { name: string }) => tag.name) || [];
      const promptId = props.PromptID?.rich_text?.[0]?.plain_text?.trim() || generatePromptId(title, content, tags);
      const enabled = props.Enabled?.checkbox === undefined ? true : props.Enabled.checkbox;
      const notes = props.Notes?.rich_text?.[0]?.plain_text?.trim() || '';
      const lastModified = props.LastModified?.rich_text?.[0]?.plain_text?.trim() || new Date().toISOString();

      return {
        id: promptId,
        notionPageId: page.id,
        title,
        content,
        tags,
        enabled,
        categoryId: props.CategoryID?.rich_text?.[0]?.plain_text?.trim() || DEFAULT_CATEGORY_ID, // assign categoryId
        notes: notes || undefined, // Only set when there is content
        lastModified,
      } as PromptItem;
    });
  } catch (error) {
    console.error('Error fetching prompts from Notion:', error);
    return null;
  }
};

// Synchronize Notion's Prompts to local storage
export const syncPromptsFromNotion = async (mode: 'replace' | 'append' = 'replace'): Promise<boolean> => {
  console.log(`Starting sync from Notion to local storage (mode: ${mode})`);
  const apiKey = await getNotionApiKey();
  const databaseId = await getDatabaseId();

  if (!apiKey || !databaseId) {
    console.error('Notion API key or Database ID is missing. Cannot sync from Notion.');
    return false;
  }

  try {
    // First make sure the database structure is complete
    console.log('Checking and updating database structure if needed...');
    const structureUpdated = await ensureDatabaseStructure(apiKey, databaseId);
    if (!structureUpdated) {
      console.error('Failed to ensure database structure. Sync may fail if required fields are missing.');
      // Continue synchronization, but may fail
    }

    const notionPrompts = await fetchNotionPrompts(apiKey, databaseId);
    if (notionPrompts === null) {
      console.error('Failed to fetch prompts from Notion. Aborting sync from Notion.');
      return false; // If acquisition fails, do not continue
    }

    console.log(`Fetched ${notionPrompts.length} prompts from Notion.`);

    const localPromptsResult = await browser.storage.local.get(BROWSER_STORAGE_KEY);
    let localPrompts: PromptItem[] = localPromptsResult[BROWSER_STORAGE_KEY] || [];
    console.log(`Found ${localPrompts.length} prompts locally before sync.`);

    let newLocalPrompts: PromptItem[];

    if (mode === 'replace') {
      console.log('Sync mode: replace. Replacing all local prompts with Notion prompts.');
      newLocalPrompts = notionPrompts;
    } else {
      // append mode
      console.log('Sync mode: append. Merging Notion prompts with local prompts.');
      const localPromptIds = new Set(localPrompts.map((p) => p.id));
      const promptsToAppend = notionPrompts.filter((np) => !localPromptIds.has(np.id));
      newLocalPrompts = [...localPrompts, ...promptsToAppend];
      console.log(`Appending ${promptsToAppend.length} new prompts from Notion.`);
    }

    //Update local storage
    const dataToStore: Record<string, any> = {};
    dataToStore[BROWSER_STORAGE_KEY] = newLocalPrompts;
    await browser.storage.local.set(dataToStore);

    console.log(`Successfully synced ${newLocalPrompts.length} prompts from Notion to local storage (mode: ${mode}).`);
    return true;
  } catch (error) {
    console.error('Error during sync from Notion:', error);
    return false;
  }
};

// --- Functions for Syncing Local to Notion ---

async function createNotionPage(prompt: PromptItem, apiKey: string, databaseId: string, titlePropName: string): Promise<string | null> {
  console.log(`Creating new Notion page for "${prompt.title}" (ID: ${prompt.id})`);
  try {
    const properties: any = {
      [titlePropName]: { title: [{ text: { content: prompt.title } }] },
      Content: { rich_text: [{ text: { content: prompt.content || '' } }] },
      Tags: { multi_select: prompt.tags?.map((tag) => ({ name: tag })) || [] },
      PromptID: { rich_text: [{ text: { content: prompt.id || generatePromptId(prompt.title, prompt.content, prompt.tags) } }] },
      CategoryID: { rich_text: [{ text: { content: prompt.categoryId || DEFAULT_CATEGORY_ID } }] },
      Enabled: { checkbox: prompt.enabled === undefined ? true : !!prompt.enabled }, // Make sure it's a boolean
      Notes: { rich_text: [{ text: { content: prompt.notes || '' } }] },
      LastModified: { rich_text: [{ text: { content: prompt.lastModified || new Date().toISOString() } }] },
    };

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });

    if (!response.ok) {
      const errorData: any = await response.json();
      console.error(`Error creating Notion page for "${prompt.title}":`, errorData);
      throw new Error(`Failed to create page: ${errorData.message || response.status}`);
    }
    const pageData: any = await response.json();
    console.log(`Successfully created Notion page for "${prompt.title}", Page ID: ${pageData.id}`);
    return pageData.id; // Return the newly created Notion Page ID
  } catch (error) {
    console.error(`Error in createNotionPage for "${prompt.title}":`, error);
    return null;
  }
}

async function updateNotionPage(notionPageId: string, prompt: PromptItem, apiKey: string, databaseId: string, titlePropName: string): Promise<{ success: boolean; error?: string }> {
  console.log(`Updating Notion page ${notionPageId} for "${prompt.title}" (ID: ${prompt.id})`);
  try {
    const properties: any = {
      [titlePropName]: { title: [{ text: { content: prompt.title } }] },
      Content: { rich_text: [{ text: { content: prompt.content || '' } }] },
      Tags: { multi_select: prompt.tags?.map((tag) => ({ name: tag })) || [] },
      // PromptID usually shouldn't change, so we don't update it here.
      // If the CategoryID can change, it should be updated here.
      CategoryID: { rich_text: [{ text: { content: prompt.categoryId || DEFAULT_CATEGORY_ID } }] },
      Enabled: { checkbox: prompt.enabled === undefined ? true : !!prompt.enabled }, // Make sure it's a boolean
      Notes: { rich_text: [{ text: { content: prompt.notes || '' } }] },
      LastModified: { rich_text: [{ text: { content: prompt.lastModified || new Date().toISOString() } }] },
    };

    const response = await fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      const errorData: any = await response.json();
      console.error(`Error updating Notion page ${notionPageId} for "${prompt.title}":`, errorData);
      const errorMessage = `Failed to update page: ${errorData.message || response.status}`;
      throw new Error(errorMessage);
    }
    console.log(`Successfully updated Notion page ${notionPageId} for "${prompt.title}"`);
    return { success: true };
  } catch (error: any) {
    const errorMessage = error.message || `renew"${prompt.title}" An unknown error occurred`;
    console.error(`Error in updateNotionPage for "${prompt.title}" (Page ID: ${notionPageId}):`, error);
    return { success: false, error: errorMessage };
  }
}

async function archiveNotionPage(notionPageId: string, apiKey: string): Promise<boolean> {
  try {
    const response: Response = await fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ archived: true }),
    });
    if (!response.ok) {
      const errorData: any = await response.json();
      console.error(`Error archiving Notion page ${notionPageId}:`, errorData);
      throw new Error(`Failed to archive page: ${errorData.message || response.status}`);
    }
    console.log(`Successfully archived Notion page ${notionPageId}`);
    return true;
  } catch (error) {
    console.error(`Error in archiveNotionPage for Page ID ${notionPageId}:`, error);
    return false;
  }
}

// Synchronize local Prompts to Notion
export const syncPromptsToNotion = async (localPrompts: PromptItem[]): Promise<{ success: boolean; errors?: string[] }> => {
  console.log('Starting sync from local storage to Notion...');
  const apiKey = await getNotionApiKey();
  const databaseId = await getDatabaseId();
  const errors: string[] = [];

  if (!apiKey || !databaseId) {
    console.error('Notion API key or Database ID is not configured.');
    return { success: false, errors: ['Notion API key or database ID is not configured.'] };
  }

  console.log('Checking and updating database structure if needed...');
  const structureOk = await ensureDatabaseStructure(apiKey, databaseId);
  if (!structureOk) {
    console.error('Failed to ensure database structure. Aborting sync to Notion.');
    return { success: false, errors: ['The Notion database structure cannot be ensured to be complete and cannot be synchronized.'] };
  }
  // Re-fetch schema after potential update to get correct title attribute names
  const schema = await fetchNotionDatabaseSchema(apiKey, databaseId);
  if (!schema) {
    console.error('Cannot sync to Notion without database schema (even after attempting to ensure structure).');
    return { success: false, errors: ['Unable to obtain the Notion database structure and cannot synchronize.'] };
  }
  const titlePropName = notionDatabaseTitlePropertyName; // This value is updated by fetchNotionDatabaseSchema

  try {
    const notionPrompts = await fetchNotionPrompts(apiKey, databaseId);
    if (notionPrompts === null) {
      console.error('Failed to fetch existing prompts from Notion. Aborting sync.');
      return { success: false, errors: ['Unable to obtain existing prompt words from Notion and cannot be synchronized.'] };
    }

    const notionPromptsMapById: Map<string, any> = new Map();
    notionPrompts.forEach((p) => {
      if (p.id) notionPromptsMapById.set(p.id, p); // Assume p.id is the PromptID in Notion
    });
    console.log(`Found ${notionPromptsMapById.size} prompts in Notion with a PromptID.`);

    const localPromptsMapById: Map<string, PromptItem> = new Map();
    localPrompts.forEach((p) => localPromptsMapById.set(p.id, p));

    for (const localPrompt of localPrompts) {
      const notionPage = notionPromptsMapById.get(localPrompt.id);
      const localEnabled = localPrompt.enabled === undefined ? true : !!localPrompt.enabled;

      if (notionPage) {
        // Prompt exists in Notion, check whether it needs to be updated
        // Make sure notionPage.enabled is interpreted correctly (it comes from props.Enabled.checkbox)
        const notionEnabled = notionPage.enabled === undefined ? true : !!notionPage.enabled;

        const contentChanged = localPrompt.content !== notionPage.content;
        const titleChanged = localPrompt.title !== notionPage.title;
        const tagsChanged = JSON.stringify(localPrompt.tags?.sort()) !== JSON.stringify(notionPage.tags?.sort());
        const categoryChanged = (localPrompt.categoryId || DEFAULT_CATEGORY_ID) !== (notionPage.categoryId || DEFAULT_CATEGORY_ID);
        const enabledChanged = localEnabled !== notionEnabled;
        const notesChanged = (localPrompt.notes || '') !== (notionPage.notes || '');
        const lastModifiedChanged = (localPrompt.lastModified || '') !== (notionPage.lastModified || '');

        if (titleChanged || contentChanged || tagsChanged || categoryChanged || enabledChanged || notesChanged || lastModifiedChanged) {
          console.log(
            `Local prompt "${localPrompt.title}" (ID: ${localPrompt.id}) has changes. Updating Notion page ${notionPage.notionPageId}. Changes: title=${titleChanged}, content=${contentChanged}, tags=${tagsChanged}, category=${categoryChanged}, enabled=${enabledChanged}, notes=${notesChanged}, lastModified=${lastModifiedChanged}`,
          );
          const updateResult = await updateNotionPage(notionPage.notionPageId, localPrompt, apiKey, databaseId, titlePropName);
          if (!updateResult.success && updateResult.error) {
            errors.push(`Update prompt word"${localPrompt.title}"fail: ${updateResult.error}`);
          }
        } else {
          console.log(`Local prompt "${localPrompt.title}" (ID: ${localPrompt.id}) matches Notion page ${notionPage.notionPageId}. No update needed.`);
        }
      } else {
        // Prompt does not exist in Notion, create it
        const pageId = await createNotionPage(localPrompt, apiKey, databaseId, titlePropName);
        if (!pageId) {
          errors.push(`Create prompt word"${localPrompt.title}"fail.`);
        }
      }
    }

    //Archive prompts that exist in Notion but not in localPrompts (if they have a PromptID)
    for (const notionPrompt of notionPrompts) {
      // Also make sure notionPageId exists before trying to archive
      if (notionPrompt.id && notionPrompt.notionPageId && !localPromptsMapById.has(notionPrompt.id)) {
        // This hint exists in Notion but not locally. File it.
        // This means that local deletion should result in Notion archiving.
        console.log(`Prompt "${notionPrompt.title}" (ID: ${notionPrompt.id}, NotionPageID: ${notionPrompt.notionPageId}) exists in Notion but not locally. Archiving.`);
        const archiveResult = await archiveNotionPage(notionPrompt.notionPageId, apiKey);
        if (!archiveResult) {
          errors.push(`Archive prompt word"${notionPrompt.title}"fail.`);
        }
      }
    }

    // After creation/update, re-fetch local hints from storage (if ID is newly generated or confirmed)
    // This step is probably best handled by a calling function (e.g. a background script)
    // Store the Notion Page ID back to the local prompt if needed.
    // Right now, this function is focused on pushing to Notion.
    // But let's make sure that the local prompt is updated when the newly generated PromptID item does not have an ID.
    const currentLocalPromptsResult = await browser.storage.local.get(BROWSER_STORAGE_KEY);
    let currentLocalPrompts: PromptItem[] = (currentLocalPromptsResult[BROWSER_STORAGE_KEY as keyof typeof currentLocalPromptsResult] as PromptItem[]) || [];

    currentLocalPrompts = currentLocalPrompts.map((p) => {
      if (!p.id) {
        // Ideally this should not happen if the ID is pre-generated
        const newId = generatePromptId(p.title, p.content, p.tags);
        console.warn(`Local prompt "${p.title}" was missing an ID. Generated: ${newId}`);
        // If the corresponding project is created in Notion, it uses this new ID.
        // This part can be tricky if createNotionPage doesn't return an ID or if matching is difficult.
        // For simplicity, we assume that the ID exists or was correctly generated by createNotionPage.
        return { ...p, id: newId };
      }
      return p;
    });

    // If the newly created Notion page needs to update the Notion Page ID of the local prompt, the logic here will be more complicated.
    // Because createNotionPage needs to return the Notion Page ID and PromptID, and then we need to match them back.
    // The current createNotionPage sends localPrompt.id as PromptID.
    // Therefore, there is currently no need to directly update the ID in local storage based on Notion's response.
    //The most important thing is that PromptID remains consistent.

    console.log('Successfully synced local prompts to Notion.');

    // If there is an error but partial success, return partial success status
    if (errors.length > 0) {
      return { success: true, errors: errors }; // Despite the error, consider it a partial success
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error syncing prompts to Notion:', error);
    return { success: false, errors: [error.message || 'An unknown error occurred while syncing to Notion'] };
  }
};
