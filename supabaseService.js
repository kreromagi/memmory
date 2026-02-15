import { createClient } from '@supabase/supabase-js';

class SupabaseService {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async saveDesignSystemData(fileKey, data) {
    try {
      const { data: mainRecord, error: mainError } = await this.supabase
        .from('design_systems')
        .upsert({
          figma_file_key: fileKey,
          file_name: data.fileName,
          last_modified: data.lastModified,
          last_sync: new Date().toISOString(),
          design_tokens: data.designTokens
        })
        .select()
        .single();

      if (mainError) throw mainError;

      await this.supabase
        .from('design_system_pages')
        .delete()
        .eq('design_system_id', mainRecord.id);

      const pagesData = data.pages.map(page => ({
        design_system_id: mainRecord.id,
        page_id: page.id,
        page_name: page.name,
        page_type: page.type,
        content: page.content,
        components: page.components,
        guidelines: page.guidelines,
        examples: page.examples
      }));

      if (pagesData.length > 0) {
        const { error: pagesError } = await this.supabase
          .from('design_system_pages')
          .insert(pagesData);

        if (pagesError) throw pagesError;
      }

      return { success: true, id: mainRecord.id };
    } catch (error) {
      console.error('Ошибка сохранения в Supabase:', error);
      throw error;
    }
  }
}

export default SupabaseService;
