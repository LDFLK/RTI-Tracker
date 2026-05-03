import { Template } from '../types/rti';
import { db } from './mockState';
import { RTITemplateDB } from '../types/db';
import { toFormData } from '../utils/formUtils';

const TEMPLATE_BASE_URL = 'https://storage.rti.api/templates/';

const SLEEP_MS = 600;
const sleep = (ms = SLEEP_MS) => new Promise(resolve => setTimeout(resolve, ms));

export const templateService = {
  /**
   * Fetches templates with pagination
   */
  getRTITemplates: async (page: number = 1, pageSize: number = 10): Promise<{
    data: Template[],
    pagination: {
      page: number,
      pageSize: number,
      totalItems: number,
      totalPages: number
    }
  }> => {
    await sleep();

    const start = (page - 1) * pageSize;
    const end = page * pageSize;
    const totalItems = db.templates.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Map relative paths from DB to full URLs for the UI
    const data = db.templates.slice(start, end).map(t => ({
      ...t,
      description: t.description || '',
      file: t.file.startsWith('http') ? t.file : `${TEMPLATE_BASE_URL}${t.file}`
    })) as Template[];

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    };
  },

  /**
   * Fetches the actual markdown content from a file link
   */
  getTemplateContent: async (fileLink: string): Promise<string> => {
    await sleep(300);
    return db.templateFiles[fileLink] || '';
  },


  /**
   * Create a new RTI template
   */
  createRTITemplate: async (template: Omit<Template, 'id'>): Promise<Template> => {
    const contentFile = template.content 
      ? new File([template.content], 'template.md', { type: 'text/markdown' })
      : undefined;

    const formData = toFormData(
      { title: template.title, description: template.description },
      contentFile
    );

    await sleep(800);

    // Extract properties from FormData
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const fileObject = formData.get('file') as File;

    let contentFromFile = '';
    let fileLink = '';

    if (fileObject) {
      contentFromFile = await fileObject.text();
      // Combine base URL with relative filename
      fileLink = `${TEMPLATE_BASE_URL}${fileObject.name}`;
    }

    const now = new Date();
    const newRecord: RTITemplateDB = {
      id: crypto.randomUUID(),
      title: title || 'Untitled',
      description: description || null,
      file: fileLink,
      createdAt: now,
      updatedAt: now
    };

    // Save the binary content to our mock "File Storage" indexed by the LINK
    if (contentFromFile) {
      db.setTemplateFile(fileLink, contentFromFile);
    }

    db.setTemplates([newRecord, ...db.templates]);

    return {
      ...newRecord,
      description: newRecord.description || '',
      content: contentFromFile
    } as unknown as Template;
  },

  /**
   * Update an existing RTI template
   */
  updateRTITemplate: async (id: string, updates: Partial<Template>): Promise<Template> => {
    const contentFile = updates.content 
      ? new File([updates.content], 'template.md', { type: 'text/markdown' })
      : undefined;

    const formData = toFormData(
      { title: updates.title, description: updates.description },
      contentFile
    );

    await sleep(800);

    const index = db.templates.findIndex(t => t.id === id);
    if (index !== -1) {
      const oldRecord = db.templates[index];

      const fileObject = formData.get('file') as File;
      let newFileLink = oldRecord.file;
      let newContent = db.templateFiles[oldRecord.file] || '';

      if (fileObject) {
        newContent = await fileObject.text();
        newFileLink = `${TEMPLATE_BASE_URL}${fileObject.name}`;

        delete db.templateFiles[oldRecord.file];
        db.setTemplateFile(newFileLink, newContent);
      }

      const updatedRecord: RTITemplateDB = {
        ...oldRecord,
        title: (formData.get('title') as string) ?? oldRecord.title,
        description: (formData.get('description') as string) ?? oldRecord.description,
        file: newFileLink,
        updatedAt: new Date()
      };

      const newTemplates = [...db.templates];
      newTemplates[index] = updatedRecord;
      db.setTemplates(newTemplates);

      return {
        ...updatedRecord,
        description: updatedRecord.description || '',
        content: newContent
      } as unknown as Template;
    }
    throw new Error(`Template with ID ${id} not found`);
  },

  /**
   * Delete an RTI template
   */
  deleteRTITemplate: async (id: string): Promise<void> => {
    await sleep(400);
    const t = db.templates.find(tmpl => tmpl.id === id);
    if (t) {
      delete db.templateFiles[t.file];
      db.setTemplates(db.templates.filter(tmpl => tmpl.id !== id));
    }
  }
};
