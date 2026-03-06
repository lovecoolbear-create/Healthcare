'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldCheck, Zap, Bell, MessageCircle, ClipboardList, Package, User, 
  ChevronRight, CheckCircle2, AlertCircle, ArrowLeft, Send, Plus, Minus,
  Weight, Calendar, CheckSquare, History, LogOut, Moon, Utensils, X,
  Check, Activity, Award, MessageSquare, TrendingDown, LayoutDashboard, Phone,
  Settings2, Pill, CloudSun, ChevronDown, ChevronUp, Camera, Upload, Loader2, Link2,
  Droplets, Scale, MessageSquare as MessageSquareIcon, ClipboardList as ClipboardListIcon
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { mockClients, mockProducts, mockProtocol } from '../../../../mp/src/mocks/data';
import { AchievementCard } from '../../components/AchievementCard';
import { useData } from '../../context/DataContext';
import { cloud } from '../../services/cloud';

export default function TrackClient() {
  const { clients, updateClient, setClients, addHealthMetric, addCheckinLog, updateFeedback } = useData();
  const searchParams = useSearchParams();
  const slugFromUrl = searchParams.get('s');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // 核心状态自持化
  const [isVerified, setIsVerified] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const APP_VERSION = 'v1.2.0-FINAL-V5';
  
  // 强制版本校验逻辑：如果当前版本与代码中的版本不符，强制刷新一次
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedVersion = localStorage.getItem('hc_app_version');
      if (storedVersion !== APP_VERSION) {
        console.log('Version mismatch, forcing reload...', storedVersion, '->', APP_VERSION);
        localStorage.setItem('hc_app_version', APP_VERSION);
        
        // 如果不是第一次运行（即 storedVersion 有值且不符），强制刷新
        if (storedVersion) {
          // 清理所有缓存并刷新
          if ('caches' in window) {
            caches.keys().then(names => {
              for (let name of names) caches.delete(name);
            });
          }
          window.location.reload();
        }
      }
    }
  }, []);
  
  // 业务状态
  const [activeTab, setActiveTab] = useState<'today' | 'trends' | 'messages' | 'me'>('today');
  const [activeSlot, setActiveSlot] = useState<string>('breakfast');
  const [newMessage, setNewMessage] = useState('');
  const [achievementToShow, setAchievementToShow] = useState<{ type: 'streak' | 'milestone', value: number } | null>(null);
  
  const [clientId, setClientId] = useState<string | null>(null);

  const checkinRules = useMemo(() => {
    // 默认积分规则
    return [
      { id: 'streak-3', category: 'points', condition: { type: 'adherence_streak', value: 3 }, reward: { type: 'points', value: 1 } },
      { id: 'streak-7', category: 'points', condition: { type: 'adherence_streak', value: 7 }, reward: { type: 'points', value: 2 } }
    ];
  }, []);

  const getPointsForDay = (day: number) => {
    // 每天 1 分，第 3 天额外 +1，第 7 天额外 +2
    let points = 1;
    if (day === 3) points += 1;
    if (day === 7) points += 2;
    
    return day === 1 ? `${points}pt` : `+${points}pt`;
  };
  
  // 头像上传逻辑
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // 打分颜色逻辑
  const getScoreColor = useCallback((score: number, type: 'bg' | 'text' | 'shadow') => {
    // 基础防御：如果是 0、null、undefined 或 NaN
    if (score === undefined || score === null || isNaN(Number(score)) || Number(score) === 0) {
      return type === 'text' ? 'text-slate-300' : 'bg-slate-50';
    }
    
    const colors = [
      { bg: 'bg-rose-500', text: 'text-rose-600', shadow: 'shadow-rose-100' },     // 1
      { bg: 'bg-rose-400', text: 'text-rose-500', shadow: 'shadow-rose-100' },     // 2
      { bg: 'bg-orange-500', text: 'text-orange-600', shadow: 'shadow-orange-100' }, // 3
      { bg: 'bg-orange-400', text: 'text-orange-500', shadow: 'shadow-orange-100' }, // 4
      { bg: 'bg-amber-500', text: 'text-amber-600', shadow: 'shadow-amber-100' },  // 5
      { bg: 'bg-amber-400', text: 'text-amber-500', shadow: 'shadow-amber-100' },  // 6
      { bg: 'bg-lime-500', text: 'text-lime-600', shadow: 'shadow-lime-100' },    // 7
      { bg: 'bg-lime-400', text: 'text-lime-500', shadow: 'shadow-lime-100' },    // 8
      { bg: 'bg-emerald-500', text: 'text-emerald-600', shadow: 'shadow-emerald-100' }, // 9
      { bg: 'bg-emerald-600', text: 'text-emerald-700', shadow: 'shadow-emerald-100' }  // 10
    ];
    
    // 确保索引在 0-9 之间
    const scoreNum = Number(score);
    const index = Math.min(9, Math.max(0, Math.floor(scoreNum) - 1));
    const colorObj = colors[index];
    
    // 如果由于某种原因 colorObj 还是 undefined (防御性编程)
    if (!colorObj) {
      return type === 'text' ? 'text-slate-300' : 'bg-slate-50';
    }
    
    return colorObj[type];
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client) return;

    // 校验文件类型和大小 (限制 2MB)
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      return;
    }

    try {
      setIsUploading(true);
      
      // 使用 FileReader 读取为 Base64 (在 Serverless 环境下作为简单持久化方案)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        // 更新客户端数据
        await updateClient(client, { avatar_url: base64String });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Avatar upload failed:', error);
      setIsUploading(false);
      alert('头像上传失败，请重试');
    }
  };

  // 趋势数据模拟
  const weightTrendData = [
    { date: '02-27', weight: 79.5, fat: 25.5 },
    { date: '02-28', weight: 79.2, fat: 25.3 },
    { date: '03-01', weight: 78.8, fat: 25.0 },
    { date: '03-02', weight: 79.0, fat: 25.1 },
    { date: '03-03', weight: 78.5, fat: 24.8 },
    { date: '03-04', weight: 78.2, fat: 24.6 },
    { date: '03-05', weight: 78.0, fat: 24.5 },
  ];

  // PRD 需求状态
  const [dailyVitals, setDailyVitals] = useState({
    weight: '',
    bodyFat: '',
    muscleMass: '',
    visceralFat: ''
  });
  const [dailyFeedback, setDailyFeedback] = useState({
    mood: 0,
    energy: 0,
    sleep: 0,
    bowel: 0,
    notes: ''
  });
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterTarget, setWaterTarget] = useState(8); // 默认8杯 (2.0L)
  const [showWaterTargetModal, setShowWaterTargetModal] = useState(false);
  const [isSyncedToday, setIsSyncedToday] = useState(false);
  
  const [checkinLogs, setCheckinLogs] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  const client = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);
  const protocols = useMemo(() => [mockProtocol], []);
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const currentPhase = useMemo(() => {
    if (!client) return protocols[0].phases[0];
    const protocol = protocols.find(p => p.id === client.protocol_id);
    return protocol ? protocol.phases[0] : protocols[0].phases[0];
  }, [protocols, client]);

  const tasks = useMemo(() => {
    if (!currentPhase || !client) return [];
    const actions = (currentPhase as any).actions || [];
    return actions.map((action: any) => {
      const slot_id = `${todayStr}:${action.timing_tag}:${action.product_id}`;
      const log = checkinLogs.find(l => l.client_id === client?.id && l.slot_id === slot_id);
      const product = mockProducts.find(p => p.id === action.product_id);
      return {
        id: action.id,
        slot_id,
        tag: action.timing_tag,
        label: product?.name || action.product_id,
        dosage: action.dosage || '1份',
        method: action.method || '随餐服用',
        product_id: action.product_id,
        completed: !!log?.is_taken,
        log_id: log?.id
      };
    });
  }, [currentPhase, client, todayStr, checkinLogs]);

  const getSlotTasks = useCallback((slot: string) => {
    return tasks.filter((t: any) => {
      const tag = t.tag.toLowerCase();
      if (slot === 'breakfast') {
        return tag.includes('morning') || tag.includes('breakfast') || tag.includes('wake') || 
               tag.includes('empty_stomach') || tag.includes('before_meal') || tag.includes('with_meal');
      }
      if (slot === 'lunch') {
        return tag.includes('lunch') || tag.includes('afternoon') || tag.includes('any_time');
      }
      if (slot === 'dinner') {
        return tag.includes('dinner') || tag.includes('evening') || tag.includes('after_meal');
      }
      if (slot === 'before_bed') {
        return tag.includes('bed') || tag.includes('sleep') || tag.includes('before_bed');
      }
      return false;
    });
  }, [tasks]);

  // 板块折叠状态
  const [collapsedSections, setCollapsedSections] = useState({
    plan: false,
    vitals: false,
    feedback: false
  });

  // 格式化日期与天气
  const dateInfo = useMemo(() => {
    const d = new Date();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return {
      date: `${d.getMonth() + 1}月${d.getDate()}日`,
      weekday: weekdays[d.getDay()],
      weather: '晴转多云 22°C' // Mocked weather
    };
  }, []);

  // 检查板块完成情况
  const isPlanCompleted = useMemo(() => {
    const todayTasks = getSlotTasks('breakfast').concat(getSlotTasks('lunch'), getSlotTasks('dinner'), getSlotTasks('before_bed'));
    return todayTasks.length > 0 && todayTasks.every((t: any) => t.completed);
  }, [getSlotTasks]);

  const isVitalsCompleted = useMemo(() => {
    // 允许 0 或 0.0，只要不是空字符串
    return !!(dailyVitals.weight && dailyVitals.bodyFat !== '' && dailyVitals.muscleMass !== '' && dailyVitals.visceralFat !== '');
  }, [dailyVitals]);

  const isFeedbackCompleted = useMemo(() => {
    return dailyFeedback.mood > 0 && dailyFeedback.energy > 0 && dailyFeedback.sleep > 0 && dailyFeedback.bowel > 0;
  }, [dailyFeedback]);

  // 核心业务逻辑：当输入变化时，重置同步状态
  useEffect(() => {
    // 如果正在同步中，不要重置状态
    if (isSyncingRef.current) return;

    if (isSyncedToday) {
      console.log('[Track] 检测到数据变化，重置同步状态');
      setIsSyncedToday(false);
    }
  }, [dailyVitals, dailyFeedback, waterIntake]);

  // 自动折叠逻辑：填写完成即折叠 (独立处理)
  const lastPlanStatus = useRef(isPlanCompleted);
  useEffect(() => {
    if (isPlanCompleted && !lastPlanStatus.current) {
      console.log('[Track] 健康计划已完成，触发自动折叠');
      setCollapsedSections(prev => ({ ...prev, plan: true }));
    }
    lastPlanStatus.current = isPlanCompleted;
  }, [isPlanCompleted]);

  const lastVitalsStatus = useRef(isVitalsCompleted);
  useEffect(() => {
    if (isVitalsCompleted && !lastVitalsStatus.current) {
      console.log('[Track] 健康指标已完成，触发自动折叠');
      setCollapsedSections(prev => ({ ...prev, vitals: true }));
    }
    lastVitalsStatus.current = isVitalsCompleted;
  }, [isVitalsCompleted]);

  const lastFeedbackStatus = useRef(isFeedbackCompleted);
  useEffect(() => {
    if (isFeedbackCompleted && !lastFeedbackStatus.current) {
      console.log('[Track] 体感反馈已完成，触发自动折叠');
      setCollapsedSections(prev => ({ ...prev, feedback: true }));
    }
    lastFeedbackStatus.current = isFeedbackCompleted;
  }, [isFeedbackCompleted]);

  // 挂载检查
  useEffect(() => {
    setMounted(true);
  }, []);

  // 初始化逻辑
  useEffect(() => {
    if (!mounted) return;
    const savedId = localStorage.getItem('hc_client_id');
    if (savedId) {
      setClientId(savedId);
      setIsVerified(true);
      
      // 加载当日数据
      const savedDailyData = localStorage.getItem(`hc_daily_${savedId}_${todayStr}`);
          if (savedDailyData) {
            try {
              const parsed = JSON.parse(savedDailyData);
              if (parsed.vitals) setDailyVitals(parsed.vitals);
              if (parsed.feedback) {
                setDailyFeedback(prev => ({
                  ...prev,
                  ...parsed.feedback
                }));
              }
              if (parsed.water !== undefined) setWaterIntake(parsed.water);
              if (parsed.waterTarget !== undefined) setWaterTarget(parsed.waterTarget);
              if (parsed.isSyncedToday !== undefined) setIsSyncedToday(parsed.isSyncedToday);
            } catch (e) {
              console.error('Failed to parse daily data', e);
              localStorage.removeItem(`hc_daily_${savedId}_${todayStr}`);
            }
          }
    } else if (slugFromUrl) {
      // 检查 slug 是否匹配
      const clientBySlug = clients.find(c => c.slug === slugFromUrl);
      if (clientBySlug) {
        console.log(`[Track] Slug 匹配成功: ${clientBySlug.name}`);
        // 可以选择自动填充手机号的部分位（出于隐私考虑不全显）
        // 或者只是在界面上显示 "欢迎 [Name]"
      }
    }
    setIsAuthChecking(false);
  }, [mounted]);

  // 数据持久化
  useEffect(() => {
    if (!mounted || !clientId) return;
    const dataToSave = {
      vitals: dailyVitals,
      feedback: dailyFeedback,
      water: waterIntake,
      waterTarget: waterTarget,
      isSyncedToday: isSyncedToday,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`hc_daily_${clientId}_${todayStr}`, JSON.stringify(dataToSave));
  }, [mounted, clientId, dailyVitals, dailyFeedback, waterIntake, waterTarget, isSyncedToday, todayStr]);

  // 自动切换时段
  useEffect(() => {
    if (!mounted) return;
    const hour = new Date().getHours();
    if (hour < 11) setActiveSlot('breakfast');
    else if (hour < 15) setActiveSlot('lunch');
    else if (hour < 20) setActiveSlot('dinner');
    else setActiveSlot('before_bed');
  }, [mounted]);

  const handleLogin = async () => {
    // 清洗手机号，去掉空格、中划线等
    const normalizedPhone = loginPhone.replace(/\s|-|\+86/g, '').trim();
    if (!normalizedPhone) return;
    setIsLoginLoading(true);
    setLoginError('');
    
    console.log(`[Track] 尝试登录手机号: ${normalizedPhone} (原输入: ${loginPhone})`);
    
    try {
      let found = null;
      
      // 1. 如果 URL 中有 slug，优先验证该 slug 对应的客户手机号是否匹配
      if (slugFromUrl) {
        console.log(`[Track] 优先验证 URL Slug: ${slugFromUrl}`);
        const clientBySlug = clients.find(c => c.slug === slugFromUrl);
        if (clientBySlug) {
          const clientPhone = (clientBySlug.phone || '').replace(/\s|-|\+86/g, '').trim();
          if (clientPhone === normalizedPhone) {
            found = clientBySlug;
          } else {
            console.warn(`[Track] 手机号不匹配! URL 对应客户: ${clientBySlug.name}, 手机号: ${clientPhone}`);
            setLoginError('手机号码与链接不匹配');
            setIsLoginLoading(false);
            return;
          }
        }
      }
      
      // 2. 如果没找到或没提供 slug，尝试通过手机号在全局查找 (先找本地状态)
      if (!found) {
        found = clients.find(c => {
          const p = (c.phone || '').replace(/\s|-|\+86/g, '').trim();
          return p === normalizedPhone;
        });
      }
      
      // 3. [关键增强] 如果本地状态没找到，直接尝试从云端数据库查询
      if (!found) {
        console.log(`[Track] 本地列表未找到手机号 ${normalizedPhone}，尝试云端直接查询...`);
        const cloudClient = await cloud.findClientByPhone(normalizedPhone);
        if (cloudClient) {
          console.log(`[Track] 云端直接查询成功: ${cloudClient.name}`);
          found = cloudClient;
          // 同时同步到本地状态
          setClients((prev: any[]) => {
            const exists = prev.some(c => c.id === cloudClient.id);
            if (exists) return prev;
            return [cloudClient, ...prev];
          });
        }
      }
      
      if (found) {
        console.log(`[Track] 登录成功: ${found.name} (${found.id})`);
        localStorage.setItem('hc_client_id', found.id);
        setClientId(found.id);
        setIsVerified(true);
        setLoginError('');
      } else {
        console.warn(`[Track] 登录失败: 手机号 ${normalizedPhone} 在本地和云端均未找到档案`);
        setLoginError('档案不存在或信息有误');
      }
    } catch (err: any) {
      console.error('[Track] 登录验证过程出错:', err);
      setLoginError('登录服务暂不可用，请稍后再试');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const toggleTask = async (task: any) => {
    if (!client) return;
    if (task.completed && task.log_id) {
      setCheckinLogs(prev => prev.filter(l => l.id !== task.log_id));
    } else {
      const log = {
        id: `checkin-${Date.now()}`,
        client_id: client.id,
        product_id: task.product_id,
        slot_id: task.slot_id,
        is_taken: true,
        taken_at: new Date().toISOString()
      };
      setCheckinLogs(prev => {
        const next = [...prev, log];
        const actions = (currentPhase as any).actions || [];
        const isAllDone = actions.every((action: any) => {
          const sId = `${todayStr}:${action.timing_tag}:${action.product_id}`;
          return next.some(l => l.client_id === client?.id && l.slot_id === sId && l.is_taken);
        });
        if (isAllDone) {
          setTimeout(() => {
            setAchievementToShow({ type: 'streak', value: client.checkin_streak || 1 });
          }, 1000);
        }
        return next;
      });
    }
  };

  const handleSendFeedback = async () => {
    if (!client || !newMessage.trim()) return;
    const feedback = {
      id: `msg-${Date.now()}`,
      client_id: client.id,
      practitioner_id: client.practitioner_id,
      content: newMessage,
      sender_type: 'client',
      is_read: false,
      created_at: new Date().toISOString()
    };
    setFeedbacks(prev => [...prev, feedback]);
    setNewMessage('');
  };

  const clientFeedbacks = useMemo(() => {
    if (!client) return [];
    return feedbacks.filter(f => f.client_id === client.id).sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [feedbacks, client]);

  // [v5.0] 已读回执逻辑：进入消息页时，静默将所有营养师消息标为已读
  useEffect(() => {
    if (activeTab === 'messages' && clientFeedbacks.length > 0) {
      clientFeedbacks.forEach((f: any) => {
        if (f.sender_type === 'practitioner' && !f.is_read) {
          updateFeedback(f.id, { is_read: true });
        }
      });
    }
  }, [activeTab, clientFeedbacks, updateFeedback]);

  const unreadCount = useMemo(() => 
    clientFeedbacks.filter(f => f.sender_type === 'practitioner' && !f.is_read).length,
  [clientFeedbacks]);

  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const handleSync = async () => {
    if (!client) return;
    
    try {
      setIsSyncing(true);
      isSyncingRef.current = true;
      const recorded_at = new Date().toISOString();
      const syncPromises = [];

      // 1. 同步体征数据 (Weight, BodyFat, MuscleMass, VisceralFat)
      if (dailyVitals.weight) {
        syncPromises.push(addHealthMetric({
          id: `metric-weight-${Date.now()}`,
          client_id: client.id,
          metric_type: 'Weight',
          metric_value: parseFloat(dailyVitals.weight),
          metric_unit: 'kg',
          is_private: false,
          recorded_at
        }));
      }
      if (dailyVitals.bodyFat) {
        syncPromises.push(addHealthMetric({
          id: `metric-fat-${Date.now()}`,
          client_id: client.id,
          metric_type: 'BodyFat',
          metric_value: parseFloat(dailyVitals.bodyFat),
          metric_unit: '%',
          is_private: false,
          recorded_at
        }));
      }
      if (dailyVitals.muscleMass) {
        syncPromises.push(addHealthMetric({
          id: `metric-muscle-${Date.now()}`,
          client_id: client.id,
          metric_type: 'MuscleMass',
          metric_value: parseFloat(dailyVitals.muscleMass),
          metric_unit: 'kg',
          is_private: false,
          recorded_at
        }));
      }
      if (dailyVitals.visceralFat) {
        syncPromises.push(addHealthMetric({
          id: `metric-vfat-${Date.now()}`,
          client_id: client.id,
          metric_type: 'VisceralFat',
          metric_value: parseFloat(dailyVitals.visceralFat),
          metric_unit: 'level',
          is_private: false,
          recorded_at
        }));
      }

      // 2. 同步体感反馈 (Mood, Energy, Sleep, Bowel)
      if (dailyFeedback.mood > 0) {
        syncPromises.push(addHealthMetric({
          id: `metric-mood-${Date.now()}`,
          client_id: client.id,
          metric_type: 'MoodScore',
          metric_value: dailyFeedback.mood,
          is_private: false,
          recorded_at
        }));
      }
      if (dailyFeedback.energy > 0) {
        syncPromises.push(addHealthMetric({
          id: `metric-energy-${Date.now()}`,
          client_id: client.id,
          metric_type: 'EnergyScore',
          metric_value: dailyFeedback.energy,
          is_private: false,
          recorded_at
        }));
      }
      if (dailyFeedback.sleep > 0) {
        syncPromises.push(addHealthMetric({
          id: `metric-sleep-${Date.now()}`,
          client_id: client.id,
          metric_type: 'SleepScore',
          metric_value: dailyFeedback.sleep,
          is_private: false,
          recorded_at
        }));
      }
      if (dailyFeedback.bowel > 0) {
        syncPromises.push(addHealthMetric({
          id: `metric-bowel-${Date.now()}`,
          client_id: client.id,
          metric_type: 'BowelScore',
          metric_value: dailyFeedback.bowel,
          is_private: false,
          recorded_at
        }));
      }

      // 3. 同步饮水量
      if (waterIntake > 0) {
        syncPromises.push(addHealthMetric({
          id: `metric-water-${Date.now()}`,
          client_id: client.id,
          metric_type: 'WaterIntake',
          metric_value: waterIntake,
          metric_unit: 'cups',
          is_private: false,
          recorded_at
        }));
      }

      // 等待所有同步完成
      await Promise.all(syncPromises);
      
      console.log(`[Track] ✅ 已成功同步 ${syncPromises.length} 项健康数据到云端`);
      
      // 更新同步状态
      setIsSyncedToday(true);
      
      // 关键修复：直接根据当前最新的数据状态进行折叠判断，而不是依赖可能还未更新的 useMemo 结果
      const currentVitalsCompleted = !!(dailyVitals.weight && dailyVitals.bodyFat !== '' && dailyVitals.muscleMass !== '' && dailyVitals.visceralFat !== '');
      const currentFeedbackCompleted = dailyFeedback.mood > 0 && dailyFeedback.energy > 0 && dailyFeedback.sleep > 0 && dailyFeedback.bowel > 0;
      
      console.log('[Track] 同步成功，执行即时折叠检查:', { currentVitalsCompleted, currentFeedbackCompleted });

      setCollapsedSections(prev => ({
        ...prev,
        vitals: currentVitalsCompleted ? true : prev.vitals,
        feedback: currentFeedbackCompleted ? true : prev.feedback
      }));
      
      // 延迟关闭 loading 以便让 UI 变化更平滑
      setTimeout(() => {
        setIsSyncing(false);
        isSyncingRef.current = false;
        // 成功反馈
        alert('已成功同步给您的营养师！');
      }, 300);
    } catch (error) {
      console.error('[Track] ❌ 同步失败:', error);
      setIsSyncing(false);
      isSyncingRef.current = false;
      alert('同步失败，请检查网络连接后重试');
    }
  };

  if (!mounted) return null;

  // --- 全屏 Loading 状态 ---
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center space-y-8 max-w-xs w-full animate-in fade-in duration-700">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 bg-emerald-100 rounded-[32px] animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 animate-bounce">
                <Zap className="w-6 h-6 fill-current" />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">正在接入健康频道</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-relaxed">
              HEALTH CHANNEL ESTABLISHING...
            </p>
            <div className="flex gap-1.5 justify-center pt-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const clientFromSlug = clients.find(c => c.slug === slugFromUrl);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 pb-32 touch-manipulation selection:bg-emerald-100 overflow-x-hidden relative">
      {/* 增强背景装饰 */}
      <div className="fixed top-0 left-0 right-0 h-[60vh] bg-gradient-to-b from-emerald-50/50 to-transparent -z-10 pointer-events-none" />
      <div className="fixed top-[-5%] right-[-5%] w-[60%] aspect-square bg-emerald-500/5 blur-[120px] rounded-full -z-10" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[50%] aspect-square bg-blue-500/5 blur-[100px] rounded-full -z-10" />

      {isVerified && client ? (
        <>
          {achievementToShow && client && (
            <div className="fixed inset-0 z-[200000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
              <AchievementCard 
                client={client as any} 
                type={achievementToShow.type} 
                value={achievementToShow.value} 
                onClose={() => setAchievementToShow(null)} 
              />
            </div>
          )}

          <header className="px-6 pt-4 pb-3 sticky top-0 bg-white/95 backdrop-blur-3xl z-40 border-b border-slate-100 rounded-b-[32px] shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">HEALTHCARE PRO</p>
                </div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight text-slate-900">{client.name}</h1>
                  <span className="px-1.5 py-0.5 bg-slate-900 text-white rounded-md text-[8px] font-black uppercase tracking-widest">PREMIUM</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="text-[11px] font-bold text-slate-600">{dateInfo.date}</span>
                  <span className="text-[8px] font-black uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-500">{dateInfo.weekday}</span>
                  <div className="flex items-center gap-1 ml-1 text-emerald-600/80">
                    <CloudSun className="w-3 h-3" />
                    <span className="text-[9px] font-black">{dateInfo.weather}</span>
                  </div>
                </div>
              </div>
              <div className="relative group">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-700" />
                <button 
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                  className="w-10 h-10 bg-white rounded-xl shadow-md shadow-slate-200 border border-slate-100 flex items-center justify-center overflow-hidden relative active:scale-95 transition-all duration-500 group/avatar"
                >
                  {isUploading ? (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                      <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity z-10">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <img 
                    src={client?.avatar_url || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'} 
                    alt="avatar" 
                    className="w-full h-full object-cover transform group-hover/avatar:scale-110 transition-transform duration-700" 
                  />
                </button>
              </div>
            </div>
          </header>

          <main className="px-6 space-y-4 mt-3">
            {activeTab === 'today' && (
              <section className="space-y-4">
                {/* 7天打卡面板 - 紧凑版 */}
                <div className="bg-slate-900 rounded-[32px] p-4 text-white shadow-2xl shadow-emerald-900/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full -mr-16 -mt-16" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                          <Award className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-400">7天连续打卡计划</h3>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">本周积分：{client.loyalty_points || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-full border border-white/10">
                        <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">DAY {client.checkin_streak || 1}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center px-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                        const isToday = day === (client.checkin_streak || 1);
                        const isPast = day < (client.checkin_streak || 1);
                        return (
                          <div key={day} className="flex flex-col items-center gap-1.5">
                            <div className={`w-8 h-10 rounded-xl flex flex-col items-center justify-center transition-all duration-500 ${
                              isPast ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 
                              isToday ? 'bg-white text-slate-900 scale-110 shadow-xl' : 
                              'bg-white/5 text-slate-500 border border-white/5'
                            }`}>
                              <span className="text-[10px] font-black">{day}</span>
                              {isPast ? <Check className="w-3 h-3 stroke-[4]" /> : <span className="text-[7px] font-black opacity-60 uppercase">{getPointsForDay(day)}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 1. 精简核心指标与饮水 (2行显示) */}
                <div className="bg-white/60 backdrop-blur-xl p-4 rounded-[32px] border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                        <Weight className="w-5 h-5" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-slate-500">今日体重：</span>
                        <div className="flex items-baseline gap-1">
                          <input 
                            type="number" 
                            value={dailyVitals.weight} 
                            onChange={(e) => setDailyVitals(p => ({...p, weight: e.target.value}))} 
                            placeholder="0.0" 
                            className="w-16 bg-transparent text-xl font-black text-slate-900 border-b-2 border-transparent focus:border-blue-500 focus:outline-none transition-all p-0"
                          />
                          <span className="text-xs font-black text-slate-400 uppercase">KG</span>
                        </div>
                      </div>
                    </div>
                    {dailyVitals.weight && (
                      <div className="flex items-center gap-1 text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                        <TrendingDown className="w-3 h-3" />
                        <span className="text-[10px] font-black">-0.3kg</span>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-slate-100/50 mx-2" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center shadow-sm">
                        <Zap className="w-5 h-5 fill-current" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-slate-500">今日饮水：</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-xl font-black text-slate-900">{(waterIntake * 0.25).toFixed(1)}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase">L</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-xl">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">目标</span>
                            <input 
                              type="number" 
                              value={waterTarget} 
                              onChange={(e) => setWaterTarget(Number(e.target.value))}
                              className="w-8 bg-transparent text-xs font-black text-cyan-600 border-b border-transparent focus:border-cyan-500 focus:outline-none text-center p-0"
                            />
                            <span className="text-[10px] font-black text-slate-400 uppercase">杯</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setWaterIntake(Math.max(0, waterIntake - 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 active:scale-90 transition-all"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setWaterIntake(waterIntake + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-cyan-600 text-white shadow-lg shadow-cyan-100 active:scale-90 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. 三大板块 */}
                <div className="space-y-4">
                  {/* 板块 1: 我的健康计划 */}
                  <div className={`bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden transition-all duration-500 ${
                    isPlanCompleted ? 'opacity-90' : ''
                  }`}>
                    <button 
                      onClick={() => setCollapsedSections(prev => ({ ...prev, plan: !prev.plan }))}
                      className={`w-full px-6 py-5 flex items-center justify-between group transition-colors ${
                        isPlanCompleted ? 'bg-slate-50/50' : 'active:bg-emerald-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                          isPlanCompleted 
                            ? 'bg-slate-200 text-slate-500 shadow-none' 
                            : 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                        }`}>
                          {isPlanCompleted ? <CheckCircle2 className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
                        </div>
                        <div className="text-left">
                          <h3 className={`text-sm font-black uppercase tracking-wider ${isPlanCompleted ? 'text-slate-400' : 'text-slate-900'}`}>今日健康计划</h3>
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${isPlanCompleted ? 'text-slate-400' : 'text-slate-400'}`}>
                            {isPlanCompleted ? '今日任务已全部完成' : `${tasks.filter((t: any) => t.completed).length}/${tasks.length} 已完成`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isPlanCompleted && (
                          <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase tracking-widest border border-slate-200">已完成</span>
                        )}
                        {collapsedSections.plan ? <ChevronDown className="w-5 h-5 text-slate-300" /> : <ChevronUp className="w-5 h-5 text-slate-300" />}
                      </div>
                    </button>
                    
                    {!collapsedSections.plan && (
                      <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
                        {/* 时段切换 */}
                        <div className="flex bg-slate-50/80 p-1 rounded-2xl">
                          {['breakfast', 'lunch', 'dinner', 'before_bed'].map((slot) => (
                            <button
                              key={slot}
                              onClick={() => setActiveSlot(slot)}
                              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                activeSlot === slot ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              {slot === 'breakfast' ? '早' : slot === 'lunch' ? '中' : slot === 'dinner' ? '晚' : '睡'}
                            </button>
                          ))}
                        </div>

                        {/* 任务列表 (紧凑版) */}
                        <div className="space-y-3">
                          {getSlotTasks(activeSlot).map((task: any) => (
                            <div 
                              key={task.id}
                              onClick={() => toggleTask(task)}
                              className={`group flex items-center justify-between p-2 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${
                                task.completed 
                                  ? 'bg-emerald-50/30 border-emerald-100' 
                                  : 'bg-white border-slate-100 hover:border-emerald-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                  task.completed ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400'
                                }`}>
                                  <Pill className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className={`text-[11px] font-black uppercase tracking-wide transition-all ${
                                    task.completed ? 'text-emerald-900/50 line-through' : 'text-slate-900'
                                  }`}>
                                    {task.label}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{task.dosage}</span>
                                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{task.method}</span>
                                  </div>
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                                task.completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'
                              }`}>
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            </div>
                          ))}
                          {getSlotTasks(activeSlot).length === 0 && (
                            <div className="py-8 text-center">
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">当前时段暂无计划</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 板块 2: 我的健康数据 */}
                  <div className={`bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden transition-all duration-500 ${
                    isVitalsCompleted ? 'opacity-90' : ''
                  }`}>
                    <button 
                      onClick={() => setCollapsedSections(prev => ({ ...prev, vitals: !prev.vitals }))}
                      className={`w-full px-6 py-5 flex items-center justify-between group transition-colors ${
                        isVitalsCompleted ? 'bg-slate-50/50' : 'active:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                          isVitalsCompleted
                            ? 'bg-slate-200 text-slate-500 shadow-none' 
                            : 'bg-white text-blue-600 shadow-sm border border-blue-100'
                        }`}>
                          {isVitalsCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                        </div>
                        <div className="text-left">
                          <h3 className={`text-sm font-black uppercase tracking-wider ${isVitalsCompleted ? 'text-slate-400' : 'text-slate-900'}`}>今日健康指标</h3>
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${isVitalsCompleted ? 'text-slate-400' : 'text-slate-400'}`}>
                            {isVitalsCompleted ? '今日体征已录入完成' : '请录入今日体征指标'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isVitalsCompleted && (
                          <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase tracking-widest border border-slate-200">已完成</span>
                        )}
                        {collapsedSections.vitals ? <ChevronDown className="w-5 h-5 text-slate-300" /> : <ChevronUp className="w-5 h-5 text-slate-300" />}
                      </div>
                    </button>

                    {!collapsedSections.vitals && (
                      <div className="px-6 pb-6 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-300">
                        {[
                          { label: '体脂率', key: 'bodyFat', unit: '%', icon: Activity, color: 'text-orange-500', bg: 'bg-orange-50' },
                          { label: '肌肉量', key: 'muscleMass', unit: 'KG', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                          { label: '内脏脂肪', key: 'visceralFat', unit: '级', icon: ShieldCheck, color: 'text-purple-500', bg: 'bg-purple-50' }
                        ].map((item) => (
                          <div key={item.key} className="bg-slate-50/50 p-3 rounded-2xl border border-transparent focus-within:border-blue-200 transition-all">
                            <div className="flex items-center gap-2 mb-2">
                              <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <input 
                                type="number" 
                                value={(dailyVitals as any)[item.key]} 
                                onChange={(e) => setDailyVitals(p => ({...p, [item.key]: e.target.value}))}
                                placeholder="0.0"
                                className="w-full bg-transparent text-lg font-black text-slate-900 focus:outline-none p-0"
                              />
                              <span className="text-[10px] font-black text-slate-400 uppercase">{item.unit}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 板块 3: 体感反馈 */}
                  <div className={`bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden transition-all duration-500 ${
                    isFeedbackCompleted ? 'opacity-90' : ''
                  }`}>
                    <button 
                      onClick={() => setCollapsedSections(prev => ({ ...prev, feedback: !prev.feedback }))}
                      className={`w-full px-6 py-5 flex items-center justify-between group transition-colors ${
                        isFeedbackCompleted ? 'bg-slate-50/50' : 'active:bg-purple-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                          isFeedbackCompleted
                            ? 'bg-slate-200 text-slate-500 shadow-none' 
                            : 'bg-white text-purple-600 shadow-sm border border-purple-100'
                        }`}>
                          {isFeedbackCompleted ? <CheckCircle2 className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                        </div>
                        <div className="text-left">
                          <h3 className={`text-sm font-black uppercase tracking-wider ${isFeedbackCompleted ? 'text-slate-400' : 'text-slate-900'}`}>今日体感反馈</h3>
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${isFeedbackCompleted ? 'text-slate-400' : 'text-slate-400'}`}>
                            {isFeedbackCompleted ? '今日体感已记录完成' : '记录您的身体状态'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isFeedbackCompleted && (
                          <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase tracking-widest border border-slate-200">已完成</span>
                        )}
                        {collapsedSections.feedback ? <ChevronDown className="w-5 h-5 text-slate-300" /> : <ChevronUp className="w-5 h-5 text-slate-300" />}
                      </div>
                    </button>

                    {!collapsedSections.feedback && (
                      <div className="px-6 pb-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                        {[
                          { label: '今日心情', key: 'mood', minLabel: '不好', maxLabel: '非常好' },
                          { label: '精力状态', key: 'energy', minLabel: '不好', maxLabel: '非常好' },
                          { label: '睡眠质量', key: 'sleep', minLabel: '不好', maxLabel: '非常好' },
                          { label: '肠道情况', key: 'bowel', minLabel: '排便困难', maxLabel: '非常顺畅' }
                        ].map((item) => (
                          <div key={item.key} className="space-y-3">
                            <div className="flex justify-between items-end mb-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{item.label}</label>
                              <span className={`text-sm font-black transition-colors ${getScoreColor((dailyFeedback as any)[item.key], 'text')}`}>
                                {(dailyFeedback as any)[item.key] || '-'} <span className="text-[10px] text-slate-300">/ 10</span>
                              </span>
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex justify-between px-1">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                  <button
                                    key={num}
                                    onClick={() => setDailyFeedback(p => ({...p, [item.key]: num}))}
                                    className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center ${
                                      (dailyFeedback as any)[item.key] === num
                                        ? `${getScoreColor(num, 'bg')} text-white shadow-lg ${getScoreColor(num, 'shadow')} scale-110`
                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                    }`}
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                              <div className="flex justify-between px-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                <span>{item.minLabel}</span>
                                <span>{item.maxLabel}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="space-y-3 pt-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">其他补充</label>
                          <textarea 
                            value={dailyFeedback.notes}
                            onChange={(e) => setDailyFeedback(p => ({...p, notes: e.target.value}))}
                            placeholder="描述您今日的特殊感受..."
                            className="w-full h-24 bg-slate-50 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 全局同步按钮 (浮动/底部) */}
                <div className="pt-2 pb-6 flex flex-col items-center">
                  <button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    className={`w-2/3 max-w-[280px] py-2.5 rounded-[18px] flex items-center justify-center gap-2 transition-all duration-500 shadow-lg active:scale-[0.98] ${
                      isSyncedToday 
                        ? 'bg-emerald-500 text-white shadow-emerald-100' 
                        : 'bg-slate-900 text-white shadow-slate-300'
                    }`}
                  >
                    {isSyncing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      {isSyncedToday ? '数据已同步' : (isSyncing ? '正在同步...' : '同步今日数据')}
                    </span>
                  </button>
                  <p className="text-center text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                    LAST SYNC: {isSyncedToday ? 'JUST NOW' : 'NOT SYNCED YET'}
                  </p>
                </div>
              </section>
            )}

            {/* 底部导航栏 */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-3xl border-t border-slate-100 px-6 py-2.5 z-50 rounded-t-[32px] shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.1)]">
              <div className="flex justify-between items-center max-w-md mx-auto">
                {[
                  { id: 'today', icon: LayoutDashboard, label: '今日' },
                  { id: 'trends', icon: TrendingDown, label: '趋势' },
                  { id: 'messages', icon: MessageCircle, label: '消息', badge: unreadCount },
                  { id: 'me', icon: User, label: '我的' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`flex flex-col items-center gap-1 transition-all relative ${
                      activeTab === item.id ? 'text-emerald-600 scale-110' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
                      activeTab === item.id ? 'bg-emerald-50 shadow-sm' : 'bg-transparent'
                    }`}>
                      <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                    {item.badge ? (
                      <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce shadow-lg">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </nav>

            {activeTab === 'trends' && (
              <section className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <TrendingDown className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">累计减重</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900">-1.5 <span className="text-xs text-slate-400 font-medium ml-1">KG</span></p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                    <div className="flex items-center gap-2 text-rose-500">
                      <TrendingDown className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">体脂下降</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900">-1.0 <span className="text-xs text-slate-400 font-medium ml-1">%</span></p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-sm text-slate-900">体重趋势 (KG)</h3>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">最近 7 天数据</p>
                    </div>
                  </div>
                  <div className="h-40 w-full relative mt-2">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 60">
                      <line x1="0" y1="10" x2="100" y2="10" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="30" x2="100" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="50" x2="100" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                      <path 
                        d="M 0 50 L 16 45 L 33 40 L 50 42 L 66 35 L 83 30 L 100 28" 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                      <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                      <path 
                        d="M 0 50 L 16 45 L 33 40 L 50 42 L 66 35 L 83 30 L 100 28 V 60 H 0 Z" 
                        fill="url(#weightGradient)" 
                      />
                      {[50, 45, 40, 42, 35, 30, 28].map((y, i) => (
                        <circle key={i} cx={i * 16.6} cy={y} r="3" fill="white" stroke="#10b981" strokeWidth="2" />
                      ))}
                    </svg>
                    <div className="flex justify-between mt-4 px-1">
                      {weightTrendData.map(d => (
                        <span key={d.date} className="text-[9px] font-medium text-slate-400">{d.date.split('-')[1]}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'messages' && (
              <section className="space-y-4">
                <div className="bg-white rounded-3xl p-5 min-h-[500px] flex flex-col shadow-sm border border-slate-100">
                  <div className="flex-1 space-y-5 overflow-y-auto px-1">
                    {clientFeedbacks.length > 0 ? (
                      clientFeedbacks.map((f: any) => (
                        <div key={f.id} className={`flex ${f.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                            f.sender_type === 'client' 
                            ? 'bg-emerald-600 text-white rounded-tr-none' 
                            : 'bg-slate-50 text-slate-900 rounded-tl-none border border-slate-100'
                          }`}>
                            {f.content}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-20 text-slate-300">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MessageCircle className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest">随时向营养师提问</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <input 
                      type="text" 
                      value={newMessage} 
                      onChange={(e) => setNewMessage(e.target.value)} 
                      placeholder="输入您的疑问..." 
                      className="flex-1 bg-transparent px-3 py-2 text-sm font-medium outline-none placeholder:text-slate-300" 
                    />
                    <button onClick={handleSendFeedback} className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg shadow-emerald-100 active:scale-90 transition-all">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'me' && (
              <section className="space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img src={client.avatar_url} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-lg text-slate-900">{client.name}</h3>
                      <p className="text-xs font-medium text-slate-400">{client.phone}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 relative">
                    <div className="absolute -top-10 right-0">
                      <span className="text-[8px] font-black text-slate-200 uppercase tracking-widest">Build {APP_VERSION}</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl text-center space-y-0.5 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">累计打卡</p>
                      <p className="text-xl font-bold text-slate-900">{(client as any).checkin_count || client.checkin_streak || 0} <span className="text-[10px] text-slate-400 font-medium">天</span></p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-2xl text-center space-y-0.5 border border-emerald-100/50">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">当前连胜</p>
                      <p className="text-xl font-bold text-emerald-700">{client.checkin_streak || 0} <span className="text-[10px] text-emerald-600 font-medium">天</span></p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full flex items-center justify-between p-4 rounded-2xl bg-rose-50/50 text-rose-600 font-bold text-sm active:scale-[0.98] transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <LogOut className="w-4 h-4" />
                        </div>
                        <span>退出当前账号</span>
                      </div>
                    </button>
                  </div>
                </div>
              </section>
            )}
          </main>

          <nav className="fixed bottom-0 left-0 right-0 px-6 pb-6 pt-3 bg-white/95 backdrop-blur-2xl border-t border-slate-100 z-50 shadow-[0_-15px_40px_rgba(0,0,0,0.05)] rounded-t-[32px]">
            <div className="max-w-md mx-auto flex justify-around items-center relative">
              {[
                { id: 'today', icon: LayoutDashboard, label: '今日' },
                { id: 'trends', icon: Activity, label: '趋势' },
                { id: 'messages', icon: MessageCircle, label: '咨询', badge: unreadCount },
                { id: 'me', icon: User, label: '我的' }
              ].map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => setActiveTab(item.id as any)} 
                  className={`flex flex-col items-center gap-1 transition-all duration-300 relative group ${
                    activeTab === item.id 
                    ? 'text-emerald-600' 
                    : 'text-slate-400'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    activeTab === item.id 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 scale-105 -translate-y-1' 
                    : 'bg-transparent active:scale-90'
                  }`}>
                    <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                  </div>
                  <span className={`text-[9px] font-black tracking-widest uppercase transition-all duration-300 ${
                    activeTab === item.id 
                    ? 'text-emerald-700 opacity-100' 
                    : 'text-slate-400 opacity-60'
                  }`}>
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-md animate-pulse">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </nav>
        </>
      ) : (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 mb-4">
                <LayoutDashboard className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">HealthCare Pro</h1>
              <p className="text-slate-400 mt-2 text-[10px] font-black uppercase tracking-[0.2em]">CLIENT PORTAL ACCESS</p>
            </div>

            <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/60 p-8 border border-slate-100 relative">
              {clientFromSlug && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full border border-emerald-100 shadow-sm flex items-center gap-2 whitespace-nowrap">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Hi, {clientFromSlug.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-6 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
                <span className="font-black text-[10px] uppercase tracking-widest">安全身份认证</span>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    手机号码
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                      type="tel" 
                      value={loginPhone} 
                      onChange={(e) => setLoginPhone(e.target.value)} 
                      placeholder="请输入您的手机号" 
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-sm font-black outline-none transition-all" 
                    />
                  </div>
                  {loginError && (
                    <p className="text-red-500 text-[10px] font-black uppercase tracking-wide mt-2 flex items-center gap-1 ml-1">
                      <AlertCircle className="w-4 h-4" /> {loginError}
                    </p>
                  )}
                </div>

                <button 
                  onClick={handleLogin} 
                  disabled={isLoginLoading || !loginPhone.trim()}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 ${
                    isLoginLoading || !loginPhone.trim()
                      ? 'bg-slate-200 cursor-not-allowed shadow-none' 
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                  }`}
                >
                  {isLoginLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>正在开启...</span>
                    </>
                  ) : '开启健康旅程'}
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 text-center space-y-2">
                <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">
                  SSL SECURED · AUTHORIZED ACCESS ONLY
                </p>
                <p className="text-[9px] text-slate-200 font-black uppercase tracking-widest">
                  VERSION: {APP_VERSION}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
