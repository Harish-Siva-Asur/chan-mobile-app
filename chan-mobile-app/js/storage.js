/**
 * CHAN - Storage & State Management
 * Persistent local storage manager for player profile, XP leveling, daily quests, and chronicle diary.
 */

const STORAGE_KEYS = {
  PROFILE: 'chan_user_profile',
  PROGRESS: 'chan_user_progress',
  QUESTS: 'chan_daily_quests',
  DIARY: 'chan_chronicle_notes',
  WEEKLY_STATS: 'chan_weekly_stats'
};

const DEFAULT_PROFILE = {
  name: 'Shadow Warrior',
  title: 'Novice Hunter',
  avatar: '⚡',
  pin: '1234',
  soundEnabled: true,
  hapticsEnabled: true,
  themeColor: '#00F2FE'
};

const DEFAULT_PROGRESS = {
  xp: 150,
  streak: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  totalWorkouts: 3,
  totalReps: 120,
  totalMinutes: 45
};

const DEFAULT_QUESTS = [
  {
    id: 'quest-1',
    name: 'Pull-Ups',
    icon: '💪',
    targetSets: 3,
    targetReps: '5 reps',
    muscle: 'Back & Biceps',
    completedSets: 0
  },
  {
    id: 'quest-2',
    name: 'Push-Ups',
    icon: '🤸',
    targetSets: 3,
    targetReps: '15 reps',
    muscle: 'Chest & Arms',
    completedSets: 0
  },
  {
    id: 'quest-3',
    name: 'Bodyweight Squats',
    icon: '🦵',
    targetSets: 3,
    targetReps: '20 reps',
    muscle: 'Legs & Core',
    completedSets: 0
  },
  {
    id: 'quest-4',
    name: 'Core Plank Hold',
    icon: '⚡',
    targetSets: 3,
    targetReps: '45 sec',
    muscle: 'Abdominal Wall',
    completedSets: 0
  }
];

class AppStorage {
  constructor() {
    this.profile = this.load(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
    this.progress = this.load(STORAGE_KEYS.PROGRESS, DEFAULT_PROGRESS);
    this.quests = this.loadQuests();
    this.diary = this.load(STORAGE_KEYS.DIARY, {});
    this.weeklyStats = this.load(STORAGE_KEYS.WEEKLY_STATS, [40, 75, 100, 60, 90, 80, 50]);
    this.checkDailyStreak();
  }

  load(key, defaultValue) {
    try {
      const data = localStorage.getItem(key);
      return data ? { ...defaultValue, ...JSON.parse(data) } : defaultValue;
    } catch (e) {
      console.warn(`Error loading key ${key}:`, e);
      return defaultValue;
    }
  }

  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving key ${key}:`, e);
    }
  }

  // Quests management with daily reset
  loadQuests() {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(STORAGE_KEYS.QUESTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date === today && Array.isArray(parsed.list)) {
          return parsed.list;
        }
      } catch (e) {}
    }
    // New day: reset completedSets to 0
    const freshList = DEFAULT_QUESTS.map(q => ({ ...q, completedSets: 0 }));
    this.saveQuests(freshList);
    return freshList;
  }

  saveQuests(list = this.quests) {
    this.quests = list;
    const today = new Date().toISOString().split('T')[0];
    this.save(STORAGE_KEYS.QUESTS, { date: today, list: this.quests });
  }

  saveProfile(profileData) {
    this.profile = { ...this.profile, ...profileData };
    this.save(STORAGE_KEYS.PROFILE, this.profile);
    if (window.audioEngine) {
      window.audioEngine.soundEnabled = this.profile.soundEnabled;
      window.audioEngine.hapticsEnabled = this.profile.hapticsEnabled;
    }
  }

  saveProgress(progressData) {
    this.progress = { ...this.progress, ...progressData };
    this.save(STORAGE_KEYS.PROGRESS, this.progress);
  }

  // XP & Level calculations
  // Level N requires N * 150 XP
  getLevelInfo() {
    const xp = this.progress.xp || 0;
    let level = 1;
    let xpForCurrent = 0;
    let xpForNext = 200;

    while (xp >= xpForNext) {
      level++;
      xpForCurrent = xpForNext;
      xpForNext += level * 150;
    }

    const currentLevelProgress = xp - xpForCurrent;
    const currentLevelSpan = xpForNext - xpForCurrent;
    const percent = Math.min(100, Math.max(0, Math.floor((currentLevelProgress / currentLevelSpan) * 100)));

    // Hunter Rank Tier
    let rankTier = 'E-Rank';
    let rankTitle = 'Novice Hunter';
    if (level >= 25) { rankTier = 'S-Rank'; rankTitle = 'Shadow Sovereign'; }
    else if (level >= 18) { rankTier = 'A-Rank'; rankTitle = 'Shadow Monarch'; }
    else if (level >= 12) { rankTier = 'B-Rank'; rankTitle = 'High Warlord'; }
    else if (level >= 7) { rankTier = 'C-Rank'; rankTitle = 'Elite Berserker'; }
    else if (level >= 3) { rankTier = 'D-Rank'; rankTitle = 'Iron Guardian'; }

    return {
      level,
      xp,
      xpForCurrent,
      xpForNext,
      percent,
      rankTier,
      rankTitle
    };
  }

  addXP(amount) {
    const prevInfo = this.getLevelInfo();
    this.progress.xp = (this.progress.xp || 0) + amount;
    this.saveProgress(this.progress);
    const newInfo = this.getLevelInfo();

    const leveledUp = newInfo.level > prevInfo.level;
    return { leveledUp, newInfo, prevInfo, xpGained: amount };
  }

  // Daily Streak check
  checkDailyStreak() {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = this.progress.lastActiveDate;

    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastDate === yesterday) {
        // Streak continues
      } else if (lastDate && lastDate < yesterday) {
        // Streak broken, reset to 1
        this.progress.streak = 1;
      }
      this.progress.lastActiveDate = today;
      this.saveProgress(this.progress);
    }
  }

  // Diary entries
  getDiaryEntry(dateKey) {
    return this.diary[dateKey] || {
      text: '',
      mood: '🔥',
      weight: '',
      water: '2.5',
      updatedAt: null
    };
  }

  saveDiaryEntry(dateKey, entryData) {
    this.diary[dateKey] = {
      ...this.getDiaryEntry(dateKey),
      ...entryData,
      updatedAt: new Date().toISOString()
    };
    this.save(STORAGE_KEYS.DIARY, this.diary);
  }

  // JSON Data Backup & Restore
  exportBackup() {
    return JSON.stringify({
      version: '2.0',
      exportedAt: new Date().toISOString(),
      profile: this.profile,
      progress: this.progress,
      quests: this.quests,
      diary: this.diary,
      weeklyStats: this.weeklyStats
    }, null, 2);
  }

  importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.profile) this.saveProfile(data.profile);
      if (data.progress) this.saveProgress(data.progress);
      if (data.quests) this.saveQuests(data.quests);
      if (data.diary) {
        this.diary = data.diary;
        this.save(STORAGE_KEYS.DIARY, this.diary);
      }
      return true;
    } catch (e) {
      console.error('Failed to import backup:', e);
      return false;
    }
  }
}

window.appStorage = new AppStorage();
