/**
 * Supabase Client wrapper
 */
class SupabaseClient {
    constructor(url, key) {
        this.url = url;
        this.key = key;
        this.client = null;
    }

    init() {
        if (!this.url || !this.key) {
            throw new Error('Supabase URL и Key обязательны');
        }
        this.client = supabase.createClient(this.url, this.key);
        return this;
    }

    async testConnection() {
        if (!this.client) this.init();
        const { data, error } = await this.client.from('sync_sessions').select('id').limit(1);
        if (error) throw new Error(`Supabase ошибка: ${error.message}`);
        return true;
    }

    async createSyncSession(fileKey, fileName) {
        const { data, error } = await this.client
            .from('sync_sessions')
            .insert({
                figma_file_key: fileKey,
                file_name: fileName,
                status: 'in_progress'
            })
            .select()
            .single();
        if (error) throw new Error(`Ошибка создания сессии: ${error.message}`);
        return data;
    }

    async updateSyncSession(sessionId, updates) {
        const { error } = await this.client
            .from('sync_sessions')
            .update(updates)
            .eq('id', sessionId);
        if (error) console.error('Ошибка обновления сессии:', error);
    }

    async savePage(pageData) {
        const { data, error } = await this.client
            .from('ds_pages')
            .insert(pageData)
            .select()
            .single();
        if (error) throw new Error(`Ошибка сохранения страницы: ${error.message}`);
        return data;
    }

    async saveColors(colors) {
        if (!colors || colors.length === 0) return;
        const { error } = await this.client.from('ds_colors').insert(colors);
        if (error) console.error('Ошибка сохранения цветов:', error);
    }

    async saveTypography(items) {
        if (!items || items.length === 0) return;
        const { error } = await this.client.from('ds_typography').insert(items);
        if (error) console.error('Ошибка сохранения типографики:', error);
    }

    async saveComponents(items) {
        if (!items || items.length === 0) return;
        const { error } = await this.client.from('ds_components').insert(items);
        if (error) console.error('Ошибка сохранения компонентов:', error);
    }

    async saveShadows(items) {
        if (!items || items.length === 0) return;
        const { error } = await this.client.from('ds_shadows').insert(items);
        if (error) console.error('Ошибка сохранения теней:', error);
    }

    async saveSpacing(items) {
        if (!items || items.length === 0) return;
        const { error } = await this.client.from('ds_spacing').insert(items);
        if (error) console.error('Ошибка сохранения отступов:', error);
    }

    async saveLayout(items) {
        if (!items || items.length === 0) return;
        const { error } = await this.client.from('ds_layout').insert(items);
        if (error) console.error('Ошибка сохранения layout:', error);
    }

    async saveGuidelines(items) {
        if (!items || items.length === 0) return;
        const { error } = await this.client.from('ds_guidelines').insert(items);
        if (error) console.error('Ошибка сохранения руководств:', error);
    }

    async saveMemory(items) {
        if (!items || items.length === 0) return;
        const { error } = await this.client.from('ds_memory').insert(items);
        if (error) console.error('Ошибка сохранения памяти:', error);
    }

    async clearAllData() {
        const tables = ['ds_memory', 'ds_guidelines', 'ds_layout', 'ds_spacing', 'ds_shadows', 'ds_components', 'ds_typography', 'ds_colors', 'ds_pages', 'sync_sessions'];
        for (const table of tables) {
            await this.client.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
    }

    async getAllMemory(sessionId) {
        let query = this.client.from('ds_memory').select('*').order('category');
        if (sessionId) query = query.eq('sync_session_id', sessionId);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async getAllColors(sessionId) {
        let query = this.client.from('ds_colors').select('*');
        if (sessionId) query = query.eq('sync_session_id', sessionId);
        const { data, error } = await query;
        return data || [];
    }

    async getAllTypography(sessionId) {
        let query = this.client.from('ds_typography').select('*');
        if (sessionId) query = query.eq('sync_session_id', sessionId);
        const { data, error } = await query;
        return data || [];
    }

    async getAllComponents(sessionId) {
        let query = this.client.from('ds_components').select('*');
        if (sessionId) query = query.eq('sync_session_id', sessionId);
        const { data, error } = await query;
        return data || [];
    }

    async getAllShadows(sessionId) {
        let query = this.client.from('ds_shadows').select('*');
        if (sessionId) query = query.eq('sync_session_id', sessionId);
        const { data, error } = await query;
        return data || [];
    }

    async getAllSpacing(sessionId) {
        let query = this.client.from('ds_spacing').select('*');
        if (sessionId) query = query.eq('sync_session_id', sessionId);
        const { data, error } = await query;
        return data || [];
    }

    async getAllGuidelines(sessionId) {
        let query = this.client.from('ds_guidelines').select('*');
        if (sessionId) query = query.eq('sync_session_id', sessionId);
        const { data, error } = await query;
        return data || [];
    }

    async getPages(sessionId) {
        let query = this.client.from('ds_pages').select('*').order('page_order');
        if (sessionId) query = query.eq('sync_session_id', sessionId);
        const { data, error } = await query;
        return data || [];
    }
}
