'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  mockClients, 
  mockProducts, 
  mockGlobalTriggers, 
  mockProtocol,
  mockIngredients
} from '../../../mp/src/mocks/data';
import { Client, Product, Protocol, ProtocolTrigger, Ingredient, FollowUpNote } from '@healthcare/shared';
import { cloud } from '../services/cloud';

export interface UserTask {
  id: string;
  clientId: string;
  type: 'manual_todo';
  content: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'completed';
  createdAt: string;
  script?: string;
}

export interface ImportBatch {
  id: string;
  type: 'clients' | 'products';
  timestamp: string;
  count: number;
  dataIds: string[]; // 记录该批次导入的所有 ID，用于撤回
}

interface DataContextType {
  clients: Client[];
  products: Product[];
  triggers: ProtocolTrigger[];
  protocols: Protocol[];
  ingredients: Ingredient[]; // 新增：成分库状态
  importBatches: ImportBatch[]; // 新增：导入批次记录
  userTasks: UserTask[]; // 新增：手动创建的待办任务
  addClient: (client: Client) => Promise<void>;
  updateClient: (client: Client, partial?: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product, partial?: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addIngredient: (ingredient: Ingredient) => Promise<void>; // 新增：添加成分
  bulkAddClients: (clients: Client[], batchId: string) => Promise<void>;
  bulkAddProducts: (products: Product[], batchId: string) => Promise<void>;
  rollbackBatch: (batchId: string) => Promise<void>;
  addTrigger: (trigger: ProtocolTrigger) => Promise<void>;
  updateTrigger: (trigger: ProtocolTrigger, partial?: Partial<ProtocolTrigger>) => Promise<void>;
  deleteTrigger: (id: string) => Promise<void>;
  addProtocol: (protocol: Protocol) => Promise<void>;
  updateProtocol: (protocol: Protocol, partial?: Partial<Protocol>) => Promise<void>;
  deleteProtocol: (id: string) => Promise<void>;
  cleanEmptyProtocols: () => Promise<number>;
  addUserTask: (task: UserTask) => Promise<void>;
  updateUserTask: (task: UserTask, partial?: Partial<UserTask>) => Promise<void>;
  deleteUserTask: (id: string) => Promise<void>;
  addUserLog: (clientId: string, log: Omit<FollowUpNote, 'id' | 'client_id' | 'practitioner_id' | 'created_at'>, tags?: string[]) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  // Initialize state with lazy initialization to access localStorage only on client
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [triggers, setTriggers] = useState<ProtocolTrigger[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]); // 新增状态
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]); // 新增状态
  const [userTasks, setUserTasks] = useState<UserTask[]>([]); // 新增状态
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const initData = async () => {
      // 优先从云端加载，云端不可用则回退到 localStorage 或 Mock
      try {
        const [
          cloudClients, 
          cloudProducts, 
          cloudTriggers, 
          cloudProtocols,
          cloudIngredients,
          cloudBatches,
          cloudTasks
        ] = await Promise.all([
          cloud.getCollection<Client>('clients'),
          cloud.getCollection<Product>('products'),
          cloud.getCollection<ProtocolTrigger>('triggers'),
          cloud.getCollection<Protocol>('protocols'),
          cloud.getCollection<Ingredient>('ingredients'),
          cloud.getCollection<ImportBatch>('import_batches'),
          cloud.getCollection<UserTask>('user_tasks'),
        ]);

        if (cloudClients.length > 0) {
          setClients(cloudClients);
        } else {
          const stored = localStorage.getItem('hc_clients');
          setClients(stored ? JSON.parse(stored) : mockClients);
        }

        if (cloudProducts.length > 0) {
          setProducts(cloudProducts);
        } else {
          const stored = localStorage.getItem('hc_products');
          setProducts(stored ? JSON.parse(stored) : mockProducts);
        }

        if (cloudTriggers.length > 0) {
          setTriggers(cloudTriggers);
        } else {
          const stored = localStorage.getItem('hc_triggers');
          setTriggers(stored ? JSON.parse(stored) : mockGlobalTriggers);
        }

        if (cloudProtocols.length > 0) {
          setProtocols(cloudProtocols);
        } else {
          const stored = localStorage.getItem('hc_protocols');
          setProtocols(stored ? JSON.parse(stored) : [mockProtocol]);
        }

        if (cloudIngredients.length > 0) {
          setIngredients(cloudIngredients);
        } else {
          const stored = localStorage.getItem('hc_ingredients');
          setIngredients(stored ? JSON.parse(stored) : mockIngredients);
        }

        if (cloudBatches.length > 0) {
          setImportBatches(cloudBatches);
        } else {
          const stored = localStorage.getItem('hc_import_batches');
          setImportBatches(stored ? JSON.parse(stored) : []);
        }

        if (cloudTasks.length > 0) {
          setUserTasks(cloudTasks);
        } else {
          const stored = localStorage.getItem('hc_user_tasks');
          setUserTasks(stored ? JSON.parse(stored) : []);
        }
      } catch (error) {
        console.error('初始化云端数据失败，回退到本地存储:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    initData();
  }, []);

  // 状态变更时仅保存到 localStorage 作为备份（云端同步已移至操作函数内部）
  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_clients', JSON.stringify(clients));
  }, [clients, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_products', JSON.stringify(products));
  }, [products, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_triggers', JSON.stringify(triggers));
  }, [triggers, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_protocols', JSON.stringify(protocols));
  }, [protocols, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_ingredients', JSON.stringify(ingredients));
  }, [ingredients, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_import_batches', JSON.stringify(importBatches));
  }, [importBatches, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_user_tasks', JSON.stringify(userTasks));
  }, [userTasks, isLoaded]);

  // CRUD Operations with Cloud Sync
  const addClient = async (client: Client) => {
    setClients(prev => [client, ...prev]);
    await cloud.addItem('clients', client);
  };

  const updateClient = async (updatedClient: Client, partialUpdate?: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    // 如果提供了 partialUpdate，则只同步增量数据到云端，否则全量同步
    await cloud.updateItem('clients', updatedClient.id, partialUpdate || updatedClient);
  };

  const deleteClient = async (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    await cloud.deleteItem('clients', id);
  };

  const addProduct = async (product: Product) => {
    setProducts(prev => [product, ...prev]);
    await cloud.addItem('products', product);
  };

  const updateProduct = async (updatedProduct: Product, partialUpdate?: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    await cloud.updateItem('products', updatedProduct.id, partialUpdate || updatedProduct);
  };

  const deleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    await cloud.deleteItem('products', id);
  };

  const bulkAddClients = async (newClients: Client[], batchId: string) => {
    setClients(prev => [...newClients, ...prev]);
    const batch: ImportBatch = {
      id: batchId,
      type: 'clients',
      timestamp: new Date().toISOString(),
      count: newClients.length,
      dataIds: newClients.map(c => c.id)
    };
    setImportBatches(prev => [batch, ...prev]);
    
    // 云端同步
    await Promise.all([
      cloud.syncData('clients', newClients),
      cloud.addItem('import_batches', batch)
    ]);
  };

  const addTrigger = async (trigger: ProtocolTrigger) => {
    setTriggers(prev => [...prev, trigger]);
    await cloud.addItem('triggers', trigger);
  };

  const updateTrigger = async (updatedTrigger: ProtocolTrigger, partialUpdate?: Partial<ProtocolTrigger>) => {
    setTriggers(prev => prev.map(t => t.id === updatedTrigger.id ? updatedTrigger : t));
    await cloud.updateItem('triggers', updatedTrigger.id, partialUpdate || updatedTrigger);
  };

  const deleteTrigger = async (id: string) => {
    setTriggers(prev => prev.filter(t => t.id !== id));
    await cloud.deleteItem('triggers', id);
  };

  const addProtocol = async (protocol: Protocol) => {
    setProtocols(prev => [protocol, ...prev]);
    await cloud.addItem('protocols', protocol);
  };

  const updateProtocol = async (updatedProtocol: Protocol, partialUpdate?: Partial<Protocol>) => {
    setProtocols(prev => {
      const exists = prev.some(p => p.id === updatedProtocol.id);
      if (exists) {
        return prev.map(p => p.id === updatedProtocol.id ? updatedProtocol : p);
      }
      return [updatedProtocol, ...prev];
    });

    const existsInCloud = protocols.some(p => p.id === updatedProtocol.id);
    if (existsInCloud) {
      await cloud.updateItem('protocols', updatedProtocol.id, partialUpdate || updatedProtocol);
    } else {
      await cloud.addItem('protocols', updatedProtocol);
    }
  };

  const deleteProtocol = async (id: string) => {
    setProtocols(prev => prev.filter(p => p.id !== id));
    await cloud.deleteItem('protocols', id);
  };

  const cleanEmptyProtocols = async () => {
    const emptyProtocols = protocols.filter(p => 
      (!p.name || p.name === '新调理配方 SOP' || p.name.trim() === '') && 
      p.phases.length === 0 && 
      p.triggers.length === 0
    );

    if (emptyProtocols.length === 0) return 0;

    const idsToDelete = emptyProtocols.map(p => p.id);
    setProtocols(prev => prev.filter(p => !idsToDelete.includes(p.id)));
    
    await Promise.all(idsToDelete.map(id => cloud.deleteItem('protocols', id)));
    return idsToDelete.length;
  };

  const addUserTask = async (task: UserTask) => {
    setUserTasks(prev => [task, ...prev]);
    await cloud.addItem('user_tasks', task);
  };

  const updateUserTask = async (updatedTask: UserTask, partialUpdate?: Partial<UserTask>) => {
    setUserTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    await cloud.updateItem('user_tasks', updatedTask.id, partialUpdate || updatedTask);
  };

  const deleteUserTask = async (id: string) => {
    setUserTasks(prev => prev.filter(t => t.id !== id));
    await cloud.deleteItem('user_tasks', id);
  };

  const addIngredient = async (ingredient: Ingredient) => {
    setIngredients(prev => [ingredient, ...prev]);
    await cloud.addItem('ingredients', ingredient);
  };

  const addUserLog = async (clientId: string, logData: Omit<FollowUpNote, 'id' | 'client_id' | 'practitioner_id' | 'created_at'>, tags?: string[]) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const newLog: FollowUpNote = {
      ...logData,
      id: `log-${Date.now()}`,
      client_id: clientId,
      practitioner_id: client.practitioner_id,
      created_at: new Date().toISOString(),
    };

    const updatedClient = {
      ...client,
      follow_up_notes: [newLog, ...(client.follow_up_notes || [])],
      tags: tags || client.tags,
    };
    
    // 增量同步：只同步更新的字段
    const partialUpdate: Partial<Client> = {
      follow_up_notes: updatedClient.follow_up_notes,
      tags: updatedClient.tags,
    };
    
    await updateClient(updatedClient, partialUpdate);
  };

  const bulkAddProducts = async (newProducts: Product[], batchId: string) => {
    setProducts(prev => [...newProducts, ...prev]);
    const batch: ImportBatch = {
      id: batchId,
      type: 'products',
      timestamp: new Date().toISOString(),
      count: newProducts.length,
      dataIds: newProducts.map(p => p.id)
    };
    setImportBatches(prev => [batch, ...prev]);

    // 云端同步
    await Promise.all([
      cloud.syncData('products', newProducts),
      cloud.addItem('import_batches', batch)
    ]);
  };

  const rollbackBatch = async (batchId: string) => {
    const batch = importBatches.find(b => b.id === batchId);
    if (!batch) return;

    if (batch.type === 'clients') {
      setClients(prev => prev.filter(c => !batch.dataIds.includes(c.id)));
      // 从云端批量删除
      await Promise.all(batch.dataIds.map(id => cloud.deleteItem('clients', id)));
    } else {
      setProducts(prev => prev.filter(p => !batch.dataIds.includes(p.id)));
      // 从云端批量删除
      await Promise.all(batch.dataIds.map(id => cloud.deleteItem('products', id)));
    }
    setImportBatches(prev => prev.filter(b => b.id !== batchId));
    await cloud.deleteItem('import_batches', batchId);
  };

  if (!isLoaded) {
    return null; // or a loading spinner
  }

  return (
    <DataContext.Provider value={{ 
      clients, 
      products, 
      triggers, 
      protocols, 
      ingredients,
      importBatches,
      userTasks,
      addClient,
      updateClient,
      deleteClient,
      addProduct,
      updateProduct,
      deleteProduct,
      addIngredient,
      bulkAddClients,
      bulkAddProducts,
      rollbackBatch,
      addTrigger,
      updateTrigger,
      deleteTrigger,
      addProtocol,
      updateProtocol,
      deleteProtocol,
      cleanEmptyProtocols,
      addUserTask,
      updateUserTask,
      deleteUserTask,
      addUserLog
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
