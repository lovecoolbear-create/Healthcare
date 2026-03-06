import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { memfireConfig } from '../config/memfire';

/**
 * CloudService 数据同步服务
 * 
 * 核心逻辑：
 * 1. 优先尝试从云端 (Supabase Singapore) 获取/更新数据。
 * 2. 如果云端配置为空或请求失败，自动降级到 LocalStorage。
 * 3. 始终保持 LocalStorage 与最新成功获取的数据同步。
 */
export class CloudService {
  private static instance: CloudService;
  private supabase: SupabaseClient | null = null;
  private isConfigured: boolean = false;

  private constructor() {
    if (memfireConfig.url && memfireConfig.anonKey) {
      this.supabase = createClient(memfireConfig.url, memfireConfig.anonKey);
      this.isConfigured = true;
      console.log('[Cloud] 🚀 云端已配置，优先使用 Supabase (Singapore) 同步');
    } else {
      console.warn('[Cloud] ⚠️ 云端未配置或为空，当前处于本地开发模式 (LocalStorage Only)');
    }
  }

  public static getInstance(): CloudService {
    if (!CloudService.instance) {
      CloudService.instance = new CloudService();
    }
    return CloudService.instance;
  }

  /**
   * 通用获取集合数据
   */
  public async getCollection<T>(collectionName: string): Promise<T[]> {
    const localData = this.getLocal(collectionName);

    if (!this.isConfigured || !this.supabase) {
      return localData;
    }

    try {
      console.log(`[Cloud] 正在从云端获取集合: ${collectionName}...`);
      
      const { data, error } = await this.supabase
        .from(collectionName)
        .select('*');

      if (error) throw error;

      console.log(`[Cloud] ✅ 云端获取 ${collectionName} 成功, 数量: ${data?.length || 0}`);
      
      if (data) {
        this.saveLocal(collectionName, data);
      }
      
      return (data || []) as T[];
    } catch (error: any) {
      console.warn(`[Cloud] ⚠️ 云端请求失败，回退到本地数据:`, error.message);
      return localData;
    }
  }

  /**
   * 通用更新或添加数据 (同步整个列表)
   */
  public async syncData(collectionName: string, data: any[]): Promise<boolean> {
    // 始终保存到本地
    this.saveLocal(collectionName, data);

    if (!this.isConfigured || !this.supabase) {
      return true;
    }

    try {
      console.log(`[Cloud] 🚀 正在同步 ${collectionName} 到云端, 数据量: ${data.length}`);
      
      if (data.length === 0) return true;

      const { error } = await this.supabase
        .from(collectionName)
        .upsert(data, { onConflict: 'id' });

      if (error) throw error;
      
      console.log(`[Cloud] ✅ 云端同步成功`);
      return true;
    } catch (error: any) {
      console.error(`[Cloud] ❌ 云端同步失败:`, error.message || error);
      return false;
    }
  }

  /**
   * 单个添加
   */
  public async addItem(collectionName: string, item: any): Promise<void> {
    // 先更新本地
    const current = await this.getCollection(collectionName);
    this.saveLocal(collectionName, [...current, item]);

    if (!this.isConfigured || !this.supabase) return;

    try {
      const { error } = await this.supabase.from(collectionName).insert([item]);
      if (error) throw error;
      console.log(`[Cloud] ✅ 云端添加成功`);
    } catch (error: any) {
      console.error(`[Cloud] ❌ 云端添加失败:`, error.message);
    }
  }

  /**
   * 单个更新
   */
  public async updateItem(collectionName: string, id: string, item: any): Promise<void> {
    // 先更新本地
    const current = await this.getCollection(collectionName);
    const updated = current.map((i: any) => i.id === id ? { ...i, ...item } : i);
    this.saveLocal(collectionName, updated);

    if (!this.isConfigured || !this.supabase) return;

    try {
      const { error } = await this.supabase
        .from(collectionName)
        .update(item)
        .eq('id', id);

      if (error) throw error;
      console.log(`[Cloud] ✅ 云端更新成功`);
    } catch (error: any) {
      console.error(`[Cloud] ❌ 云端更新失败:`, error.message);
    }
  }

  /**
   * 单个删除
   */
  public async deleteItem(collectionName: string, id: string): Promise<void> {
    // 先更新本地
    const current = await this.getCollection(collectionName);
    const filtered = current.filter((i: any) => i.id !== id);
    this.saveLocal(collectionName, filtered);

    if (!this.isConfigured || !this.supabase) return;

    try {
      const { error } = await this.supabase
        .from(collectionName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log(`[Cloud] ✅ 云端删除成功`);
    } catch (error: any) {
      console.error(`[Cloud] ❌ 云端删除失败:`, error.message);
    }
  }

  /**
   * 通过手机号查找客户 (用于登录验证)
   */
  public async findClientByPhone(phone: string): Promise<any | null> {
    const normalizedPhone = phone.trim();
    if (!normalizedPhone) return null;

    // 1. 优先从云端查找 (如果已配置)
    if (this.isConfigured && this.supabase) {
      try {
        console.log(`[Cloud] 正在通过手机号查询客户: ${normalizedPhone}...`);
        const { data, error } = await this.supabase
          .from('clients')
          .select('*')
          .eq('phone', normalizedPhone)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          console.log(`[Cloud] ✅ 云端手机号查询成功: ${data.name}`);
          return data;
        }
      } catch (error: any) {
        console.error(`[Cloud] ❌ 云端手机号查询失败:`, error.message);
      }
    }

    // 2. 降级方案：从本地 localStorage 查找 (包含 Mock 数据)
    console.log(`[Cloud] ℹ️ 尝试从本地数据查找手机号: ${normalizedPhone}`);
    const clients = this.getLocal('clients');
    const localClient = clients.find((c: any) => (c.phone || '').trim() === normalizedPhone);
    
    if (localClient) {
      console.log(`[Cloud] ✅ 本地手机号查询成功: ${localClient.name}`);
      return localClient;
    }

    return null;
  }

  /**
   * 通过 Slug 查找客户 (用于登录验证)
   */
  public async findClientBySlug(slug: string): Promise<any | null> {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) return null;

    // 1. 优先从云端查找 (如果已配置)
    if (this.isConfigured && this.supabase) {
      try {
        console.log(`[Cloud] 正在通过 Slug 查询客户: ${normalizedSlug}...`);
        const { data, error } = await this.supabase
          .from('clients')
          .select('*')
          .eq('slug', normalizedSlug)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          console.log(`[Cloud] ✅ 云端 Slug 查询成功: ${data.name}`);
          return data;
        }
      } catch (error: any) {
        console.error(`[Cloud] ❌ 云端 Slug 查询失败:`, error.message);
      }
    }

    // 2. 降级方案：从本地 localStorage 查找 (包含 Mock 数据)
    console.log(`[Cloud] ℹ️ 尝试从本地数据查找 Slug: ${normalizedSlug}`);
    const clients = this.getLocal('clients');
    const localClient = clients.find((c: any) => (c.slug || '').trim() === normalizedSlug);
    
    if (localClient) {
      console.log(`[Cloud] ✅ 本地 Slug 查询成功: ${localClient.name}`);
      return localClient;
    }

    return null;
  }

  // --- Helper Methods ---

  private getLocal(collectionName: string): any[] {
    if (typeof window === 'undefined') return [];
    const local = localStorage.getItem(`hc_${collectionName}`);
    return local ? JSON.parse(local) : [];
  }

  private saveLocal(collectionName: string, data: any[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`hc_${collectionName}`, JSON.stringify(data));
  }
}

export const cloud = CloudService.getInstance();
