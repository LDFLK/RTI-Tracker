import { Template } from '../types/rti';
import { mockTemplates } from '../data/mockData';

export const templateService = {
  /**
   * Fetches all templates
   */
  getTemplates: async (): Promise<Template[]> => {
    // TODO: Wire up backend API for fetching all templates

    // Simulating network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    return mockTemplates;
  },

  /**
   * Saves or updates a template.
   */
  saveTemplate: async (template: Template): Promise<Template> => {
    // TODO: Wire up backend API for saving/updating a template
    // Example of sending as a physical .md file using FormData:
    // const formData = new FormData();
    // formData.append('id', template.id);
    // formData.append('title', template.title);
    // formData.append('createdAt', template.createdAt.toISOString());
    // formData.append('updatedAt', template.updatedAt.toISOString());
    // 
    // Convert the raw markdown string into a physical .md File/Blob
    // const fileBlob = new Blob([template.file], { type: 'text/markdown' });
    // formData.append('file', fileBlob, `${template.title.replace(/\s+/g, '_')}.md`);
    // 
    // await fetch('/api/templates', { method: 'POST', body: formData });
    
    // Simulating network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    console.log("Save triggered")
    return template;
  },
  
  /**
   * Deletes a template by ID.
   */
  deleteTemplate: async (_id: string): Promise<void> => {
    // TODO: Wire up backend API for deleting a template
    
    // Simulating network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    console.log("Delete triggered")
  }
};
