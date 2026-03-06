'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  CheckCircle2, 
  TrendingUp, 
  Activity, 
  Moon, 
  Zap, 
  Plus,
  ArrowRight,
  ShieldCheck,
  Award,
  MessageSquare,
  Send,
  Scale,
  X,
  Share,
  Utensils,
  ChevronRight,
  Check,
  LayoutDashboard,
  User,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Minus,
  Droplets,
  ClipboardList,
  Upload,
  LogOut
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { Feedback, WeightLog, CheckinLog } from '@healthcare/shared';
import { AchievementCard } from '../../../components/AchievementCard';
import { cloud } from '../../../services/cloud';

export default function TrackClient({ slug }: { slug: string }) {
  const { 
    clients, 
    products,
    protocols, 
    feedbacks, 
    weightLogs,
    checkinLogs,
    addFeedback, 
    addWeightLog,
    addCheckinLog,
    deleteCheckinLog,
    updateFeedback,
    updateClient,
    refreshData,
    addHealthMetric,
    triggers
  } = useData();

  const APP_VERSION = 'v1.0.5';
  
  const [activeTab, setActiveTab] = useState<'today' | 'trends' | 'messages' | 'me'>('today');
  const [activeSlot, setActiveSlot] = useState<string>('breakfast');
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newBodyFat, setNewBodyFat] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showPWAGuide, setShowPWAGuide] = useState(false);
  const [achievementToShow, setAchievementToShow] = useState<{ type: 'streak' | 'milestone', value: number } | null>(null);

  const checkinRules = useMemo(() => {
    return triggers.filter(t => t.category === 'points' && t.is_enabled && t.condition.type === 'adherence_streak');
  }, [triggers]);

  const getPointsForDay = (day: number) => {
    const rules = checkinRules.filter(r => r.condition.threshold === day);
    if (rules.length === 0) return null;
    
    // Sum up points from all matching rules for this day
    const totalPoints = rules.reduce((sum, r) => sum + parseInt(r.action.payload_template || '0'), 0);
    return totalPoints > 0 ? (day === 1 ? `${totalPoints}pt` : `+${totalPoints}pt${totalPoints > 1 ? 's' : ''}`) : null;
  };

  // --- 登录/验证状态 ---
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loginPhone, setLoginPhone] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showContactNutritionist, setShowContactNutritionist] = useState(false);

  // --- 业务状态 (PRD 核心) ---
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
  const [waterTarget, setWaterTarget] = useState(8);
  const [isSyncedToday, setIsSyncedToday] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  // 板块折叠状态
  const [collapsedSections, setCollapsedSections] = useState({
    plan: false,
    vitals: false,
    feedback: false
  });

  // 1. 基础 Hooks
  const client = useMemo(() => {
    const storedId = typeof window !== 'undefined' ? localStorage.getItem('hc_client_id') : null;
    return clients.find(c => c.id === storedId || c.slug === slug);
  }, [clients, slug]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 2. 数据相关 Hooks
  const clientFeedbacks = useMemo(() => {
    if (!client) return [];
    return feedbacks.filter(f => f.client_id === client.id).sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [feedbacks, client?.id]);

  const unreadCount = useMemo(() => {
    return clientFeedbacks.filter(f => f.sender_type === 'practitioner' && !f.is_read).length;
  }, [clientFeedbacks]);

  const latestWeightLog = useMemo(() => {
    if (!client) return null;
    const logs = weightLogs.filter(w => w.client_id === client.id);
    if (logs.length === 0) return null;
    return logs.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
  }, [weightLogs, client?.id]);

  const currentPhase = useMemo(() => {
    if (!client) return null;
    const protocol = protocols.find(p => p.id === client.protocol_id);
    if (!protocol) return null;
    return protocol.phases[0]; 
  }, [protocols, client?.protocol_id]);

  const tasks = useMemo(() => {
    if (!currentPhase || !client) return [];
    return currentPhase.actions.map(action => {
      const slot_id = `${todayStr}:${action.timing_tag}`;
      const log = checkinLogs.find(l => l.client_id === client.id && l.slot_id === slot_id);
      const product = products.find(p => p.id === action.product_id);
      
      let icon = Zap;
      if (action.timing_tag === 'before_bed') icon = Moon;
      if (action.timing_tag === 'with_meal' || action.timing_tag === 'after_meal') icon = Utensils;

      return {
        id: action.id,
        slot_id,
        tag: action.timing_tag,
        time: action.timing_tag.replace('_', ' ').toUpperCase(),
        label: product?.name || action.product_id,
        product_id: action.product_id,
        completed: !!log?.is_taken,
        log_id: log?.id,
        icon
      };
    });
  }, [currentPhase, checkinLogs, products, client?.id, todayStr]);

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
        return tag.includes('dinner') || tag.includes('evening') || tag.includes('after_meal') || 
               tag.includes('bed') || tag.includes('sleep') || tag.includes('before_bed');
      }
      return false;
    });
  }, [tasks]);

  const isPlanCompleted = useMemo(() => {
    const todayTasks = getSlotTasks('breakfast').concat(getSlotTasks('lunch'), getSlotTasks('dinner'));
    return todayTasks.length > 0 && todayTasks.every((t: any) => t.completed);
  }, [getSlotTasks]);

  const isVitalsCompleted = useMemo(() => {
    return dailyVitals.weight !== '' && 
           dailyVitals.bodyFat !== '' && 
           dailyVitals.muscleMass !== '' && 
           dailyVitals.visceralFat !== '';
  }, [dailyVitals]);

  const isFeedbackCompleted = useMemo(() => {
    return dailyFeedback.mood > 0 && 
           dailyFeedback.energy > 0 && 
           dailyFeedback.sleep > 0 && 
           dailyFeedback.bowel > 0;
  }, [dailyFeedback]);

  // 板块折叠状态的 useRef 必须在它依赖的 useMemo 之后
  const lastPlanStatus = useRef(isPlanCompleted);
  const lastVitalsStatus = useRef(isVitalsCompleted);
  const lastFeedbackStatus = useRef(isFeedbackCompleted);

  // 3. 副作用 Hooks
  useEffect(() => {
    // 检查本地存储
    const storedId = localStorage.getItem('hc_client_id');
    if (storedId) {
      setIsVerified(true);
      
      // 加载当日数据
      const today = new Date().toISOString().split('T')[0];
      const savedDailyData = localStorage.getItem(`hc_daily_${storedId}_${today}`);
      if (savedDailyData) {
        try {
          const parsed = JSON.parse(savedDailyData);
          if (parsed.vitals) setDailyVitals(parsed.vitals);
          if (parsed.feedback) setDailyFeedback(parsed.feedback);
          if (parsed.water !== undefined) setWaterIntake(parsed.water);
          if (parsed.waterTarget !== undefined) setWaterTarget(parsed.waterTarget);
          if (parsed.isSyncedToday !== undefined) setIsSyncedToday(parsed.isSyncedToday);
        } catch (e) {
          console.error('Failed to parse daily data', e);
          localStorage.removeItem(`hc_daily_${storedId}_${today}`);
        }
      }
    } else {
      setIsVerified(false);
    }
  }, []);

  // 保存数据到本地 (持久化)
  useEffect(() => {
    const storedId = typeof window !== 'undefined' ? localStorage.getItem('hc_client_id') : null;
    const currentClient = clients.find(c => c.id === storedId || c.slug === slug);
    if (!currentClient) return;
    
    const today = new Date().toISOString().split('T')[0];
    const dataToSave = {
      vitals: dailyVitals,
      feedback: dailyFeedback,
      water: waterIntake,
      waterTarget: waterTarget,
      isSyncedToday: isSyncedToday,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`hc_daily_${currentClient.id}_${today}`, JSON.stringify(dataToSave));
  }, [clients, slug, dailyVitals, dailyFeedback, waterIntake, waterTarget, isSyncedToday]);

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
  useEffect(() => {
    if (isPlanCompleted && !lastPlanStatus.current) {
      setCollapsedSections(prev => ({ ...prev, plan: true }));
    }
    lastPlanStatus.current = isPlanCompleted;
  }, [isPlanCompleted]);

  useEffect(() => {
    if (isVitalsCompleted && !lastVitalsStatus.current) {
      setCollapsedSections(prev => ({ ...prev, vitals: true }));
    }
    lastVitalsStatus.current = isVitalsCompleted;
  }, [isVitalsCompleted]);

  useEffect(() => {
    if (isFeedbackCompleted && !lastFeedbackStatus.current) {
      setCollapsedSections(prev => ({ ...prev, feedback: true }));
    }
    lastFeedbackStatus.current = isFeedbackCompleted;
  }, [isFeedbackCompleted]);

  // 进入消息页时，将所有营养师消息标为已读
  useEffect(() => {
    if (activeTab === 'messages') {
      clientFeedbacks.forEach(f => {
        if (f.sender_type === 'practitioner' && !f.is_read) {
          updateFeedback(f.id, { is_read: true });
        }
      });
    }
  }, [activeTab, clientFeedbacks, updateFeedback]);

  // PWA 相关副作用
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // 在移动端，如果未被拦截，则显示引导
      if (!localStorage.getItem('pwa_guide_dismissed')) {
        setShowPWAGuide(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    if (client && !client.push_subscription) {
      subscribeToPush();
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [client]);

  // 检测 iOS 且未添加到主屏幕
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIOS && !isStandalone && !localStorage.getItem('pwa_guide_dismissed')) {
      setShowPWAGuide(true);
    }
  }, []);

  // 检测成就达成 (7/14/21天)
  useEffect(() => {
    if (typeof window === 'undefined' || !client) return;
    
    const streak = client.checkin_streak || 0;
    const milestones = [7, 14, 21];
    
    milestones.forEach(m => {
      const key = `achievement_shown_${client.id}_streak_${m}`;
      if (streak >= m && !localStorage.getItem(key)) {
        setAchievementToShow({ type: 'streak', value: m });
        localStorage.setItem(key, 'true');
      }
    });

    if (weightLogs && weightLogs.length >= 2) {
      const sortedLogs = [...weightLogs]
        .filter(l => l.client_id === client.id && l.body_fat_percentage !== undefined)
        .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
      
      if (sortedLogs.length >= 2) {
        const firstFat = sortedLogs[0].body_fat_percentage!;
        const latestFat = sortedLogs[sortedLogs.length - 1].body_fat_percentage!;
        const reduction = firstFat - latestFat;
        
        const key = `achievement_shown_${client.id}_fat_reduction_1`;
        if (reduction >= 1 && !localStorage.getItem(key)) {
          setAchievementToShow({ type: 'milestone', value: 1 });
          localStorage.setItem(key, 'true');
        }
      }
    }
  }, [client, weightLogs]);

  // 检测失联状态 (Level 1 & Level 2)
  useEffect(() => {
    if (typeof window === 'undefined' || !client) return;

    if (client.missed_days && client.missed_days >= 1) {
      // Level 2: 48h (missed_days >= 2) - 尝试请求权限并发送本地通知 (模拟 Web Push)
      if (client.missed_days >= 2) {
        if ('Notification' in window) {
          try {
            if (Notification.permission === 'default') {
              Notification.requestPermission();
            } else if (Notification.permission === 'granted') {
              // 这里仅作为演示，实际生产中应由服务器推送
              const lastPushTime = localStorage.getItem(`last_push_${client.id}`);
              const now = Date.now();
              // 24小时内不重复推送
              if (!lastPushTime || (now - parseInt(lastPushTime)) > 86400000) {
                try {
                  new Notification('[HealthCare]', {
                    body: '您的专属营养师正在关注您的进度，记得同步今日数据。',
                    icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png'
                  });
                  localStorage.setItem(`last_push_${client.id}`, now.toString());
                } catch (err) {
                  console.error('Failed to create notification instance', err);
                }
              }
            }
          } catch (e) {
            console.error('Failed to handle notification permission/sending', e);
          }
        }
      }
    }
  }, [client]);

  // --- 业务函数 ---

  // 打分颜色逻辑
  const getScoreColor = useCallback((score: number, type: 'bg' | 'text' | 'shadow') => {
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
    
    const scoreNum = Number(score);
    const index = Math.min(9, Math.max(0, Math.floor(scoreNum) - 1));
    const colorObj = colors[index];
    
    if (!colorObj) {
      return type === 'text' ? 'text-slate-300' : 'bg-slate-50';
    }
    
    return colorObj[type];
  }, []);

  // Web Push 订阅逻辑
  const subscribeToPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted' && client) {
        console.log('[Push] 已获得通知权限');
        // 在实际生产中，这里应调用 serviceWorkerRegistration.pushManager.subscribe()
        // 并将 subscription 对象同步给后端。这里暂做模拟。
        if (!client.push_subscription) {
          await updateClient(client, { push_subscription: 'granted' as any });
        }
      }
    } catch (err) {
      console.error('[Push] 订阅失败:', err);
    }
  };

  const handleLogout = () => {
    if (confirm('确定要退出当前账号吗？')) {
      localStorage.removeItem('hc_client_id');
      setIsVerified(false);
      setLoginPhone('');
      setActiveTab('today');
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const normalizedPhone = loginPhone.replace(/\s|-|\+86/g, '').trim();
    if (!normalizedPhone) return;
    setIsLoginLoading(true);
    setLoginError(null);
    
    try {
      let found = null;
      
      // 1. 验证 URL Slug 对应的客户
      if (slug) {
        // 先从本地找
        found = clients.find(c => c.slug === slug);
        
        // 本地没找到，去云端找
        if (!found) {
          console.log(`[Login] Local slug not found, checking cloud for slug: ${slug}`);
          found = await cloud.findClientBySlug(slug);
        }

        if (found) {
          const clientPhone = (found.phone || '').replace(/\s|-|\+86/g, '').trim();
          if (clientPhone !== normalizedPhone) {
            setLoginError('手机号码与链接不匹配');
            setIsLoginLoading(false);
            setShowContactNutritionist(true);
            return;
          }
        }
      }
      
      // 2. 如果没找到（没有 slug 或者 slug 没找到），尝试通过手机号查找
      if (!found) {
        // 先从本地找
        found = clients.find(c => {
          const p = (c.phone || '').replace(/\s|-|\+86/g, '').trim();
          return p === normalizedPhone;
        });
        
        // 本地没找到，去云端找
        if (!found) {
          console.log(`[Login] Local phone not found, checking cloud for phone: ${normalizedPhone}`);
          found = await cloud.findClientByPhone(normalizedPhone);
        }
      }
      
      if (found) {
        localStorage.setItem('hc_client_id', found.id);
        setIsVerified(true);
        setLoginError(null);
      } else {
        setLoginError('档案不存在或信息有误');
        setShowContactNutritionist(true);
      }
    } catch (err: any) {
      console.error('[Login] Error:', err);
      setLoginError('登录服务暂不可用，请稍后再试');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleSync = async () => {
    if (!client) return;
    
    try {
      setIsSyncing(true);
      isSyncingRef.current = true;
      const recorded_at = new Date().toISOString();
      const syncPromises = [];

      // 1. 同步体征数据
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

      // 2. 同步体感反馈
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

      await Promise.all(syncPromises);
      
      // 更新客户状态
      await updateClient(client, {
        last_checkin_at: recorded_at,
        checkin_streak: (client.checkin_streak || 0) + 1,
        missed_days: 0
      });

      setIsSyncedToday(true);
      await refreshData();
      
    } catch (error) {
      console.error('Sync failed:', error);
      alert('同步失败，请重试');
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
  };

  const toggleTask = async (task: any) => {
    if (!client) return;
    if (task.completed && task.log_id) {
      // 撤销打卡 (库存归还逻辑由 DataContext 内部联动)
      await deleteCheckinLog(task.log_id);
    } else {
      // 幂等打卡
      const log: CheckinLog = {
        id: `checkin-${Date.now()}`,
        client_id: client.id,
        product_id: task.product_id,
        time_slot: task.time.toLowerCase(),
        slot_id: task.slot_id,
        action_id: task.id,
        is_taken: true,
        taken_at: new Date().toISOString(),
        is_auto_checkin: false
      };
      await addCheckinLog(log);
    }
  };

  const handleSendFeedback = async () => {
    if (!client || !newMessage.trim()) return;
    
    const feedback: Feedback = {
      id: `msg-${Date.now()}`,
      client_id: client.id,
      practitioner_id: client.practitioner_id,
      content: newMessage,
      sender_type: 'client',
      is_read: false,
      created_at: new Date().toISOString()
    };

    await addFeedback(feedback);
    setNewMessage('');
  };

  const handleAddWeight = async () => {
    if (!client || !newWeight) return;

    const log: WeightLog = {
      id: `weight-${Date.now()}`,
      client_id: client.id,
      weight_kg: parseFloat(newWeight),
      body_fat_percentage: newBodyFat ? parseFloat(newBodyFat) : undefined,
      recorded_at: new Date().toISOString(),
      source: 'manual'
    };

    await addWeightLog(log);
    setIsWeightModalOpen(false);
    setNewWeight('');
    setNewBodyFat('');
  };

  // --- 静默验证页 UI ---
  if (isVerified === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 mb-4">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">HealthCare Pro</h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">数字化调理系统 · 客户专属入口</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">
            <div className="flex items-center gap-2 mb-6 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-semibold text-sm">安全身份认证</span>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  手机号码
                </label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input 
                    type="tel" 
                    value={loginPhone} 
                    onChange={(e) => setLoginPhone(e.target.value)} 
                    placeholder="请输入您的手机号" 
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                    disabled={isLoginLoading}
                  />
                </div>
                {loginError && (
                  <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {loginError}
                  </p>
                )}
              </div>

              <button 
                type="submit"
                disabled={isLoginLoading || !loginPhone.trim()}
                className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 ${
                  isLoginLoading || !loginPhone.trim()
                    ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                }`}
              >
                {isLoginLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>正在开启...</span>
                  </>
                ) : (
                  <>
                    <span>开启健康之旅</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {showContactNutritionist && (
                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100 text-center animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-sm text-amber-800 mb-2">如果您是首次开启计划，请联系您的老师</p>
                  <button 
                    type="button"
                    onClick={() => {
                      window.location.href = 'tel:4001234567';
                    }}
                    className="text-xs font-bold text-amber-600 underline"
                  >
                    联系营养师开通权限
                  </button>
                </div>
              )}
            </form>

            <div className="mt-8 pt-6 border-t border-slate-50 text-center">
              <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                数据受 SSL 加密保护 · 仅限本人授权访问
              </p>
            </div>
          </div>
          
          {/* Footer info */}
          <p className="text-center text-slate-300 text-[10px] mt-8 uppercase tracking-[0.2em] font-bold">
            © 2026 HealthCare Technology. {APP_VERSION}
          </p>
        </div>
      </div>
    );
  }

  // --- 全屏 Loading 状态 (验证中或数据加载中) ---
  if (isVerified === null || !client) {
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
            <h2 className="text-lg font-black text-slate-900 tracking-tight">正在接入加密频道</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-relaxed">
              SECURITY CHANNEL ESTABLISHING...
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-32 select-none touch-manipulation overflow-x-hidden">
      {/* 装饰性背景 (统一为 Web 端翡翠绿装饰) */}
      <div className="fixed top-0 left-0 right-0 h-80 bg-emerald-600/5 -z-10 blur-3xl opacity-50" />
      <div className="fixed top-20 -right-20 w-64 h-64 bg-emerald-600/5 rounded-full -z-10 blur-3xl opacity-50" />
      
      {/* 成就勋章弹窗 (Achievement Card Modal) */}
      {achievementToShow && client && (
        <AchievementCard 
          client={client}
          type={achievementToShow.type}
          value={achievementToShow.value}
          latestWeightLog={latestWeightLog || undefined}
          onClose={() => setAchievementToShow(null)}
        />
      )}

      {/* iOS PWA 引导 */}
      {showPWAGuide && (
        <div className="fixed top-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-top duration-500">
          <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-2xl flex items-center justify-between border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                <Share className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight">添加至主屏幕</p>
                <p className="text-[10px] text-slate-400 font-medium">点击分享按钮 → 「添加到主屏幕」即可接收指导</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setShowPWAGuide(false);
                localStorage.setItem('pwa_guide_dismissed', 'true');
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 头部：客户激励看板 (统一为 Web 端风格) */}
      <header className="bg-white p-6 pb-8 rounded-b-[48px] shadow-sm border-b border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-900 rounded-[20px] flex items-center justify-center text-xl font-black text-white shadow-xl shadow-slate-200">
              {client.name?.[0] || '?'}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-900">{client.name || '健康用户'}</h1>
                <div className="p-1 bg-emerald-50 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Protocol Day {(client.checkin_streak || 0) + 1}</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-amber-500 bg-amber-50 px-3 py-1.5 rounded-2xl border border-amber-100/50">
              <Award className="w-4 h-4" />
              <span className="text-lg font-black tabular-nums">{client.loyalty_points || 0}</span>
            </div>
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1 mr-1">Points</span>
          </div>
        </div>

        {/* 连续打卡激励条 (统一为 Web 端翡翠绿) */}
        <div className="bg-slate-50/50 rounded-3xl p-5 flex flex-col gap-4 border border-slate-50 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex gap-2.5">
              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <div 
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black transition-all ${
                      day <= (client.checkin_streak || 0) 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                        : day === (client.checkin_streak || 0) + 1
                        ? 'bg-white border-2 border-emerald-600 text-emerald-600'
                        : 'bg-white border border-slate-200 text-slate-300'
                    }`}
                  >
                    {day}
                  </div>
                  <div className={`text-[8px] font-black uppercase tracking-tighter ${
                    day <= (client.checkin_streak || 0) ? 'text-emerald-600' : 'text-slate-300'
                  }`}>
                    {getPointsForDay(day)}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-right pl-4">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Next Milestone</div>
              <div className="text-xs font-black text-emerald-700 mt-0.5">+50 Pts</div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-10 relative">
        {activeTab === 'today' && (
          <div className="space-y-6">
            {/* 未读消息悬浮提示 (统一为 Web 端深色气泡) */}
            {unreadCount > 0 && (
              <button 
                onClick={() => setActiveTab('messages')}
                className="fixed bottom-32 right-6 z-[60] flex items-center gap-3 px-5 py-4 bg-slate-900 text-white rounded-[24px] shadow-2xl animate-in fade-in slide-in-from-right-10 duration-500 active:scale-95"
              >
                <div className="relative">
                  <MessageSquare className="w-5 h-5 fill-current" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-900" />
                </div>
                <span className="text-xs font-black tracking-tight">老师有新回复</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            )}

            {/* 0. 饮水追踪 (Water Intake - 统一为 Web 端风格) */}
            <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-100/50">
                  <Droplets className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">今日饮水量</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900 tabular-nums">{waterIntake * 250}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ML / {waterTarget * 250} ML</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setWaterIntake(Math.max(0, waterIntake - 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 active:bg-slate-100 active:text-slate-600 transition-all"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setWaterIntake(waterIntake + 1)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-cyan-600 text-white shadow-lg shadow-cyan-200 active:scale-90 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 1. 今日方案执行 (Task List) */}
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
                    {['breakfast', 'lunch', 'dinner'].map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setActiveSlot(slot)}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                          activeSlot === slot ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {slot === 'breakfast' ? '早' : slot === 'lunch' ? '中' : '晚'}
                      </button>
                    ))}
                  </div>

                  {/* 任务列表 */}
                  <div className="space-y-3">
                    {getSlotTasks(activeSlot).map((task: any) => (
                      <div 
                        key={task.id}
                        onClick={() => toggleTask(task)}
                        className={`group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${
                          task.completed 
                            ? 'bg-slate-50/50 border-slate-100/50' 
                            : 'bg-white border-slate-100 hover:border-emerald-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            task.completed ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400'
                          }`}>
                            {task.completed ? <Check className="w-5 h-5 stroke-[3]" /> : <task.icon className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className={`text-sm font-black uppercase tracking-wide transition-all ${
                              task.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                            }`}>
                              {task.label}
                            </h4>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          task.completed ? 'bg-emerald-500 text-white' : 'border-2 border-slate-100'
                        }`}>
                          {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. 今日健康数据 (Vitals) */}
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
                      {isVitalsCompleted ? '数据已就绪，请同步' : '请录入今日身体指标'}
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
                <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: '体重', key: 'weight', unit: 'KG', icon: TrendingUp, color: 'text-blue-500' },
                      { label: '体脂率', key: 'bodyFat', unit: '%', icon: Activity, color: 'text-orange-500' },
                      { label: '肌肉量', key: 'muscleMass', unit: 'KG', icon: Zap, color: 'text-emerald-500' },
                      { label: '内脏脂肪', key: 'visceralFat', unit: '级', icon: ShieldCheck, color: 'text-purple-500' }
                    ].map((item) => (
                      <div key={item.key} className={`p-4 rounded-[24px] border transition-all ${
                        isSyncedToday 
                          ? 'bg-slate-50/30 border-slate-100' 
                          : 'bg-slate-50/50 border-slate-100 focus-within:border-emerald-200 focus-within:bg-white'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <item.icon className={`w-3.5 h-3.5 ${isSyncedToday ? 'text-slate-300' : item.color}`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isSyncedToday ? 'text-slate-300' : 'text-slate-400'}`}>{item.label}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <input 
                            type="number" 
                            value={(dailyVitals as any)[item.key]} 
                            onChange={(e) => !isSyncedToday && setDailyVitals(p => ({...p, [item.key]: e.target.value}))}
                            placeholder="0.0"
                            disabled={isSyncedToday}
                            className={`w-full bg-transparent text-lg font-black focus:outline-none p-0 ${
                              isSyncedToday ? 'text-slate-400 cursor-not-allowed' : 'text-slate-900'
                            }`}
                          />
                          <span className={`text-[10px] font-black uppercase ${isSyncedToday ? 'text-slate-300' : 'text-slate-400'}`}>{item.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. 今日体感反馈 (Feedback) */}
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
                      {isFeedbackCompleted ? '反馈已就绪，请同步' : '记录您的身体状态'}
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
                <div className="px-6 pb-6 space-y-8 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-6">
                    {[
                      { label: '今日心情', key: 'mood', minLabel: '不好', maxLabel: '非常好' },
                      { label: '精力状态', key: 'energy', minLabel: '不好', maxLabel: '非常好' },
                      { label: '睡眠质量', key: 'sleep', minLabel: '不好', maxLabel: '非常好' },
                      { label: '肠道情况', key: 'bowel', minLabel: '排便困难', maxLabel: '非常顺畅' }
                    ].map((item) => (
                      <div key={item.key} className="space-y-3">
                        <div className="flex justify-between items-end mb-1">
                          <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isSyncedToday ? 'text-slate-300' : 'text-slate-400'}`}>{item.label}</label>
                          <span className={`text-sm font-black transition-colors ${isSyncedToday ? 'text-slate-300' : getScoreColor((dailyFeedback as any)[item.key], 'text')}`}>
                            {(dailyFeedback as any)[item.key] || '-'} <span className="text-[10px] text-slate-300">/ 10</span>
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between px-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <button
                                key={num}
                                disabled={isSyncedToday}
                                onClick={() => setDailyFeedback(p => ({...p, [item.key]: num}))}
                                className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center ${
                                  (dailyFeedback as any)[item.key] === num
                                    ? isSyncedToday
                                      ? 'bg-slate-200 text-slate-500 scale-100'
                                      : `${getScoreColor(num, 'bg')} text-white shadow-lg ${getScoreColor(num, 'shadow')} scale-110`
                                    : 'bg-slate-50 text-slate-400'
                                } ${isSyncedToday ? 'cursor-not-allowed' : 'hover:bg-slate-100 hover:text-slate-600'}`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-between px-2">
                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">{item.minLabel}</span>
                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">{item.maxLabel}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="relative">
                      <textarea 
                        value={dailyFeedback.notes}
                        onChange={(e) => !isSyncedToday && setDailyFeedback(p => ({...p, notes: e.target.value}))}
                        disabled={isSyncedToday}
                        placeholder="记录一下今天的体感变化（如：睡眠改善、胃部舒适度...）"
                        className={`w-full h-32 border rounded-[24px] p-5 text-sm font-medium outline-none transition-all placeholder:text-slate-300 resize-none ${
                          isSyncedToday 
                            ? 'bg-slate-50/30 border-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-slate-50/50 border-slate-50 focus:ring-4 focus:ring-emerald-500/5 focus:bg-white focus:border-emerald-200'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. 全局上传按钮 (仅在所有板块完成后显示) */}
            <div className="pt-4 pb-12">
              <button 
                onClick={handleSync}
                disabled={!(isPlanCompleted && isVitalsCompleted && isFeedbackCompleted) || isSyncing || isSyncedToday}
                className={`w-full py-5 rounded-[24px] text-[13px] font-black uppercase tracking-[0.3em] shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${
                  isSyncedToday 
                    ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed' 
                    : (isPlanCompleted && isVitalsCompleted && isFeedbackCompleted)
                      ? 'bg-slate-900 text-white shadow-slate-300 hover:bg-slate-800'
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none border border-slate-50'
                }`}
              >
                {isSyncing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isSyncedToday ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Upload className={`w-5 h-5 ${(isPlanCompleted && isVitalsCompleted && isFeedbackCompleted) ? 'animate-bounce' : ''}`} />
                )}
                {isSyncing ? '正在同步数据...' : isSyncedToday ? '今日数据已全部同步' : '同步今日数据至营养师'}
              </button>
              {!(isPlanCompleted && isVitalsCompleted && isFeedbackCompleted) && !isSyncedToday && (
                <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest mt-4">
                  请完成上方所有打卡项后点击同步
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                与营养师对话
              </h2>
            </div>
            
            {/* 消息列表 (统一为 Web 端风格) */}
            <div className="space-y-6 min-h-[400px]">
              {clientFeedbacks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-200 space-y-6">
                  <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center">
                    <MessageSquare className="w-10 h-10 opacity-20" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-center text-slate-300 leading-relaxed">
                    开始与你的营养师交流吧<br/>
                    获取更专业的建议与支持
                  </p>
                </div>
              ) : (
                clientFeedbacks.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] space-y-2`}>
                      <div className={`px-5 py-4 rounded-[28px] text-sm font-bold leading-relaxed shadow-sm ${
                        msg.sender_type === 'client' 
                          ? 'bg-slate-900 text-white rounded-tr-none' 
                          : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                      <div className={`text-[9px] font-black text-slate-400 px-3 flex items-center gap-2 tracking-tighter ${
                        msg.sender_type === 'client' ? 'justify-end' : 'justify-start'
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.sender_type === 'client' && (
                          <div className="flex items-center gap-1">
                            <div className={`w-1 h-1 rounded-full ${msg.is_read ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span className={msg.is_read ? 'text-emerald-600' : 'text-slate-300 uppercase tracking-widest'}>
                              {msg.is_read ? '已读' : 'SENT'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 输入区域 (统一为 Web 端风格) */}
            <div className="fixed bottom-28 left-6 right-6 z-50">
              <div className="relative flex items-center gap-3">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendFeedback()}
                  placeholder="给营养师留言..."
                  className="flex-1 bg-white border border-slate-100 shadow-2xl shadow-slate-200 rounded-[28px] py-5 px-7 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-300"
                />
                <button 
                  onClick={handleSendFeedback}
                  disabled={!newMessage.trim()}
                  className="w-14 h-14 bg-slate-900 text-white rounded-[24px] flex items-center justify-center hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-900/10 active:scale-90"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'trends' && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-200 space-y-6">
            <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center">
              <TrendingUp className="w-10 h-10 opacity-20" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-center text-slate-300 leading-relaxed">数据趋势分析建设中...</p>
          </div>
        )}

        {activeTab === 'me' && (
          <div className="flex flex-col items-center p-6 space-y-10">
            {/* 个人信息卡片 */}
            <div className="w-full bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col items-center gap-6">
              <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center relative group">
                <User className="w-12 h-12 text-slate-300" />
                <div className="absolute inset-0 rounded-[32px] border-2 border-emerald-500/0 group-hover:border-emerald-500/10 transition-all" />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-slate-900">{client?.name || '用户'}</h3>
                <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">{client?.phone || '手机号未绑定'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full pt-6 border-t border-slate-50">
                <div className="text-center">
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">坚持天数</div>
                  <div className="text-lg font-black text-slate-900">{client?.checkin_streak || 0} 天</div>
                </div>
                <div className="text-center border-l border-slate-50">
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">累计积分</div>
                  <div className="text-lg font-black text-emerald-600">{client?.loyalty_points || 0} PTS</div>
                </div>
              </div>
            </div>

            {/* 设置项 */}
            <div className="w-full space-y-3">
              <div className="bg-slate-50/50 rounded-[32px] p-4 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">个人档案管理建设中...</p>
              </div>
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-3 p-6 bg-rose-50 text-rose-600 rounded-[32px] font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all hover:bg-rose-100"
              >
                <LogOut className="w-4 h-4" />
                退出当前账号
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 底部导航栏 (统一为 Web 端风格) */}
      <nav className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        <div className="max-w-md mx-auto flex flex-col items-center gap-4">
          <div className="w-full flex justify-around items-center relative">
            {[
              { id: 'today', icon: Zap, label: '今日' },
              { id: 'trends', icon: TrendingUp, label: '趋势' },
              { id: 'messages', icon: MessageSquare, label: '咨询', badge: unreadCount },
              { id: 'me', icon: Activity, label: '我的' }
            ].map((item) => (
              <button 
                key={item.id} 
                onClick={() => setActiveTab(item.id as any)} 
                className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative group ${
                  activeTab === item.id 
                  ? 'text-emerald-600' 
                  : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all duration-300 ${activeTab === item.id ? 'bg-emerald-50 shadow-sm shadow-emerald-100/50 scale-110' : 'group-active:scale-90'}`}>
                  <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                </div>
                <span className={`text-[10px] font-black tracking-tight transition-colors ${activeTab === item.id ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {item.label}
                </span>
                {item.badge ? (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="text-[8px] font-bold text-slate-300 uppercase tracking-widest opacity-50">
            © 2026 HealthCare Tech · {APP_VERSION}
          </div>
        </div>
      </nav>

      {/* 体征录入弹窗 (统一为 Web 端风格) */}
      {isWeightModalOpen && (
        <div className="fixed inset-0 z-[200000] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md transition-all duration-300">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-2 mb-10 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-2 shadow-lg shadow-blue-50">
                <Scale className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">更新今日体征</h3>
              <p className="text-sm text-slate-400 font-medium tracking-tight">记录精准数据，见证点滴进步</p>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">体重 (KG)</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    step="0.1"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="00.0"
                    className="w-full bg-slate-50/50 border border-slate-50 rounded-[24px] p-6 text-3xl font-black text-slate-900 focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-200 outline-none transition-all placeholder:text-slate-200 text-center tabular-nums"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">体脂率 (%) - 可选</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    step="0.1"
                    value={newBodyFat}
                    onChange={(e) => setNewBodyFat(e.target.value)}
                    placeholder="00.0"
                    className="w-full bg-slate-50/50 border border-slate-50 rounded-[24px] p-6 text-3xl font-black text-slate-900 focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-200 outline-none transition-all placeholder:text-slate-200 text-center tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="mt-12 flex gap-3">
              <button 
                onClick={() => setIsWeightModalOpen(false)}
                className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-100 transition-all active:scale-[0.98]"
              >
                取消
              </button>
              <button 
                onClick={handleAddWeight}
                disabled={!newWeight}
                className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-30 disabled:grayscale transition-all"
              >
                确认并同步
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
