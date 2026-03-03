import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/unicloud';

/**
 * Supabase 数据同步服务
 */
export class CloudService {
  private static instance: CloudService;
  private supabase: SupabaseClient;

  private constructor() {
    this.supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
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
    try {
      console.log(`[Cloud] 正在从 Supabase 获取集合: ${collectionName}...`);
      
      const { data, error } = await this.supabase
        .from(collectionName)
        .select('*');

      if (error) throw error;

      console.log(`[Cloud] ✅ 获取 ${collectionName} 成功, 数量: ${data?.length || 0}`);
      
      // 更新本地缓存
      if (data) {
        localStorage.setItem(`hc_${collectionName}`, JSON.stringify(data));
      }
      
      return (data || []) as T[];
    } catch (error: any) {
      console.warn(`[Cloud] ⚠️ 获取云端失败，回退到本地数据:`, error.message);
      const local = localStorage.getItem(`hc_${collectionName}`);
      return local ? JSON.parse(local) : [];
    }
  }

  /**
   * 通用更新或添加数据 (同步整个列表)
   */
  public async syncData(collectionName: string, data: any[]): Promise<boolean> {
    // 始终先保存一份到本地作为备份
    localStorage.setItem(`hc_${collectionName}`, JSON.stringify(data));

    try {
      console.log(`[Cloud] 🚀 开始同步 ${collectionName} 到 Supabase, 数据量: ${data.length}`);
      
      if (data.length === 0) return true;

      // 使用 upsert 进行批量同步
      // 注意：Supabase 需要表有主键（通常是 id）
      const { error } = await this.supabase
        .from(collectionName)
        .upsert(data, { onConflict: 'id' });

      if (error) throw error;
      
      console.log(`[Cloud] ✅ ${collectionName} 同备成功`);
      return true;
    } catch (error: any) {
      console.error(`[Cloud] ❌ 同步 ${collectionName} 失败:`, error.message || error);
      return false;
    }
  }

  /**
   * 单个添加
   */
  public async addItem(collectionName: string, item: any): Promise<void> {
    try {
      console.log(`[Cloud] 正在添加单条数据到 ${collectionName}...`);
      const { error } = await this.supabase
        .from(collectionName)
        .insert([item]);
      
      if (error) throw error;
      console.log(`[Cloud] ✅ 添加成功`);
    } catch (error: any) {
      console.error(`[Cloud] ❌ 单个添加失败:`, error.message || error);
    }
  }

  /**
   * 单个更新
   */
  public async updateItem(collectionName: string, id: string, item: any): Promise<void> {
    try {
      console.log(`[Cloud] 正在更新 ${collectionName}/${id}...`);
      const { error } = await this.supabase
        .from(collectionName)
        .update(item)
        .eq('id', id);

      if (error) throw error;
      console.log(`[Cloud] ✅ 更新成功`);
    } catch (error: any) {
      console.error(`[Cloud] ❌ 单个更新失败:`, error.message || error);
    }
  }

  /**
   * 单个删除
   */
  public async deleteItem(collectionName: string, id: string): Promise<void> {
    try {
      console.log(`[Cloud] 正在删除 ${collectionName}/${id}...`);
      const { error } = await this.supabase
        .from(collectionName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log(`[Cloud] ✅ 删除成功`);
    } catch (error: any) {
      console.error(`[Cloud] ❌ 单个删除失败:`, error.message || error);
    }
  }
}

export const cloud = CloudService.getInstance();
