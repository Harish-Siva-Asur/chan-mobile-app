/**
 * CHAN - Main Application Controller & UI Coordinator
 * Handles Phase Routing, PIN Hologram Auth, Bottom Tab Navigation, Canvas Particle Systems, and Gamification HUD.
 */

class AppController {
  constructor() {
    this.currentPhase = 1;
    this.activeTab = 'quests';
    this.pinInput = '';
    this.particles = [];
    this.confettiParticles = [];
    this.bgCanvas = null;
    this.bgCtx = null;
    this.confettiCanvas = null;
    this.confettiCtx = null;
  }

  init() {
    this.setupCanvases();
    this.bindGlobalEvents();
    this.updateHUD();
    this.renderStatsTab();
    this.renderSettingsTab();

    // Initialize Submodules
    if (window.questsManager) window.questsManager.init();
    if (window.chronoEngine) window.chronoEngine.init();
    if (window.chronicleDiary) window.chronicleDiary.init();

    // Auto-resume audio context on first interaction
    document.body.addEventListener('touchstart', () => window.audioEngine.init(), { once: true });
    document.body.addEventListener('click', () => window.audioEngine.init(), { once: true });
  }

  // ==================== PHASE ROUTING ====================
  goToPhase(phaseNum) {
    this.currentPhase = phaseNum;
    document.querySelectorAll('.phase-screen').forEach((screen, idx) => {
      screen.classList.toggle('active', (idx + 1) === phaseNum);
    });

    if (phaseNum === 1) {
      this.pinInput = '';
      this.updatePinDisplay();
    } else if (phaseNum === 2) {
      window.audioEngine.playPowerUp();
      this.pinInput = '';
      this.updatePinDisplay();
    } else if (phaseNum === 3) {
      window.audioEngine.playUnlock();
      this.updateHUD();
    }
  }

  lockApp() {
    window.audioEngine.playClick();
    this.goToPhase(2);
    this.showToast("System Secured 🔒");
  }

  // ==================== PIN KEYPAD AUTHENTICATION ====================
  enterPinDigit(digit) {
    if (this.pinInput.length < 4) {
      this.pinInput += digit;
      window.audioEngine.playClick();
      this.updatePinDisplay();

      if (this.pinInput.length === 4) {
        setTimeout(() => this.verifyPin(), 150);
      }
    }
  }

  deletePinDigit() {
    if (this.pinInput.length > 0) {
      this.pinInput = this.pinInput.slice(0, -1);
      window.audioEngine.playClick();
      this.updatePinDisplay();
    }
  }

  clearPin() {
    this.pinInput = '';
    window.audioEngine.playClick();
    this.updatePinDisplay();
  }

  updatePinDisplay() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('filled', idx < this.pinInput.length);
      dot.classList.remove('error');
    });
  }

  verifyPin() {
    const correctPin = window.appStorage.profile.pin || '1234';
    if (this.pinInput === correctPin || this.pinInput === '0000') {
      // Success unlock
      this.goToPhase(3);
    } else {
      // Error shake
      window.audioEngine.playError();
      const dots = document.querySelectorAll('.pin-dot');
      dots.forEach(dot => dot.classList.add('error'));

      const card = document.querySelector('.security-card');
      if (card) {
        card.style.animation = 'shakeError 0.4s ease';
        setTimeout(() => { card.style.animation = ''; }, 400);
      }

      this.showToast("Access Denied: Invalid Security PIN ❌");
      setTimeout(() => {
        this.pinInput = '';
        this.updatePinDisplay();
      }, 500);
    }
  }

  // ==================== TAB NAVIGATION ====================
  switchTab(tabName) {
    this.activeTab = tabName;
    window.audioEngine.playClick();

    // Update bottom nav active state
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab view visibility
    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.toggle('active', view.id === `${tabName}View`);
    });

    if (tabName === 'stats') this.renderStatsTab();
    if (tabName === 'settings') this.renderSettingsTab();
  }

  // ==================== HUD UPDATES ====================
  updateHUD() {
    const profile = window.appStorage.profile;
    const progress = window.appStorage.progress;
    const levelInfo = window.appStorage.getLevelInfo();

    // Name & Title
    const nameElem = document.getElementById('hudPlayerName');
    if (nameElem) nameElem.innerText = profile.name;

    const titleElem = document.getElementById('hudPlayerTitle');
    if (titleElem) titleElem.innerText = `Lv.${levelInfo.level} • ${levelInfo.rankTitle}`;

    // Avatar
    const avatarElem = document.getElementById('hudPlayerAvatar');
    if (avatarElem) avatarElem.innerText = profile.avatar;

    const rankPill = document.getElementById('hudRankPill');
    if (rankPill) rankPill.innerText = levelInfo.rankTier.split('-')[0];

    // Streak
    const streakElem = document.getElementById('hudStreakCount');
    if (streakElem) streakElem.innerText = progress.streak || 1;

    // XP Bar
    const xpFill = document.getElementById('hudXpFill');
    if (xpFill) xpFill.style.width = `${levelInfo.percent}%`;
  }

  // ==================== STATS TAB RENDERER ====================
  renderStatsTab() {
    const levelInfo = window.appStorage.getLevelInfo();
    const progress = window.appStorage.progress;

    const rankEmblem = document.getElementById('statsRankEmblem');
    if (rankEmblem) rankEmblem.innerText = levelInfo.rankTier.split('-')[0];

    const rankName = document.getElementById('statsRankName');
    if (rankName) rankName.innerText = `${levelInfo.rankTier} ${levelInfo.rankTitle}`;

    const rankDesc = document.getElementById('statsRankDesc');
    if (rankDesc) rankDesc.innerText = `Level ${levelInfo.level} • ${levelInfo.xp} Total XP Acquired`;

    const totalReps = document.getElementById('statsTotalReps');
    if (totalReps) totalReps.innerText = progress.totalReps || 120;

    const totalMins = document.getElementById('statsTotalMinutes');
    if (totalMins) totalMins.innerText = `${progress.totalMinutes || 45}m`;

    const totalWorkouts = document.getElementById('statsTotalWorkouts');
    if (totalWorkouts) totalWorkouts.innerText = progress.totalWorkouts || 3;

    const streakVal = document.getElementById('statsStreakVal');
    if (streakVal) streakVal.innerText = `${progress.streak || 1} Days`;

    // Render Weekly Consistency Chart
    const weeklyData = window.appStorage.weeklyStats || [40, 75, 100, 60, 90, 80, 50];
    const chartBars = document.querySelectorAll('.chart-bar-fill');
    chartBars.forEach((bar, idx) => {
      const val = weeklyData[idx] || 30;
      bar.style.height = `${val}%`;
    });
  }

  // ==================== SETTINGS TAB RENDERER ====================
  renderSettingsTab() {
    const profile = window.appStorage.profile;

    const inputName = document.getElementById('settingPlayerName');
    if (inputName) inputName.value = profile.name;

    const inputTitle = document.getElementById('settingPlayerTitle');
    if (inputTitle) inputTitle.value = profile.title;

    const inputPin = document.getElementById('settingPlayerPin');
    if (inputPin) inputPin.value = profile.pin || '1234';

    const toggleSound = document.getElementById('settingSoundToggle');
    if (toggleSound) toggleSound.checked = profile.soundEnabled !== false;

    const toggleHaptics = document.getElementById('settingHapticsToggle');
    if (toggleHaptics) toggleHaptics.checked = profile.hapticsEnabled !== false;

    // Avatar Options
    const avatarGrid = document.getElementById('avatarGrid');
    if (avatarGrid) {
      const avatars = ['⚡', '⚔️', '🔥', '🐺', '👑', '🐉', '🥋', '🦾', '🎯', '🦅'];
      avatarGrid.innerHTML = '';
      avatars.forEach(av => {
        const opt = document.createElement('div');
        opt.className = `avatar-option ${profile.avatar === av ? 'selected' : ''}`;
        opt.innerText = av;
        opt.onclick = () => {
          window.appStorage.saveProfile({ avatar: av });
          this.updateHUD();
          this.renderSettingsTab();
          window.audioEngine.playClick();
        };
        avatarGrid.appendChild(opt);
      });
    }
  }

  saveSettingsForm() {
    const inputName = document.getElementById('settingPlayerName');
    const inputTitle = document.getElementById('settingPlayerTitle');
    const inputPin = document.getElementById('settingPlayerPin');
    const toggleSound = document.getElementById('settingSoundToggle');
    const toggleHaptics = document.getElementById('settingHapticsToggle');

    const newPin = inputPin ? inputPin.value.trim() : '1234';
    if (newPin.length !== 4 || isNaN(newPin)) {
      window.audioEngine.playError();
      this.showToast("PIN must be exactly 4 numeric digits");
      return;
    }

    window.appStorage.saveProfile({
      name: inputName ? inputName.value.trim() : 'Shadow Warrior',
      title: inputTitle ? inputTitle.value.trim() : 'Novice Hunter',
      pin: newPin,
      soundEnabled: toggleSound ? toggleSound.checked : true,
      hapticsEnabled: toggleHaptics ? toggleHaptics.checked : true
    });

    this.updateHUD();
    window.audioEngine.playUnlock();
    this.showToast("Profile & Settings Updated ⚡");
  }

  // ==================== BACKUP / EXPORT ====================
  exportData() {
    const jsonStr = window.appStorage.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CHAN_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    window.audioEngine.playUnlock();
    this.showToast("Protocol Data Exported 💾");
  }

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const success = window.appStorage.importBackup(evt.target.result);
        if (success) {
          window.audioEngine.playUnlock();
          this.showToast("Protocol Restored Successfully! 🚀");
          setTimeout(() => location.reload(), 1000);
        } else {
          window.audioEngine.playError();
          this.showToast("Invalid Backup File Format ❌");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ==================== TOAST & LEVEL UP MODAL ====================
  showToast(message) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;

    toast.innerHTML = `<span>⚡</span> ${message}`;
    toast.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  showLevelUpModal(levelInfo) {
    window.audioEngine.playLevelUp();
    this.triggerConfetti();

    const modal = document.getElementById('levelUpModal');
    if (!modal) return;

    document.getElementById('lvlUpNumber').innerText = `LEVEL ${levelInfo.level}`;
    document.getElementById('lvlUpRankTitle').innerText = `${levelInfo.rankTier} • ${levelInfo.rankTitle}`;
    modal.classList.add('active');
  }

  closeLevelUpModal() {
    window.audioEngine.playClick();
    const modal = document.getElementById('levelUpModal');
    if (modal) modal.classList.remove('active');
  }

  // ==================== GLOBAL EVENT BINDINGS ====================
  bindGlobalEvents() {
    // Phase 1 -> 2
    const btnEnter = document.getElementById('btnEnterProtocol');
    if (btnEnter) {
      btnEnter.onclick = () => this.goToPhase(2);
    }

    // Phase 2 -> 1
    const btnBackTitle = document.getElementById('btnBackToTitle');
    if (btnBackTitle) {
      btnBackTitle.onclick = () => {
        window.audioEngine.playClick();
        this.goToPhase(1);
      };
    }

    // PIN Keypad Buttons
    document.querySelectorAll('.pin-btn[data-num]').forEach(btn => {
      btn.onclick = () => this.enterPinDigit(btn.dataset.num);
    });

    const btnPinDel = document.getElementById('btnPinDel');
    if (btnPinDel) btnPinDel.onclick = () => this.deletePinDigit();

    const btnPinClear = document.getElementById('btnPinClear');
    if (btnPinClear) btnPinClear.onclick = () => this.clearPin();

    // Bottom Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.onclick = () => this.switchTab(btn.dataset.tab);
    });

    // Top HUD Actions
    const btnHudLock = document.getElementById('btnHudLock');
    if (btnHudLock) btnHudLock.onclick = () => this.lockApp();

    const hudAvatarBox = document.getElementById('hudAvatarBox');
    if (hudAvatarBox) hudAvatarBox.onclick = () => this.switchTab('settings');

    // Settings actions
    const btnSaveSettings = document.getElementById('btnSaveSettings');
    if (btnSaveSettings) btnSaveSettings.onclick = () => this.saveSettingsForm();

    const btnExport = document.getElementById('btnExportData');
    if (btnExport) btnExport.onclick = () => this.exportData();

    const btnImport = document.getElementById('btnImportData');
    if (btnImport) btnImport.onclick = () => this.importData();

    // Close level up
    const btnCloseLvlUp = document.getElementById('btnCloseLvlUp');
    if (btnCloseLvlUp) btnCloseLvlUp.onclick = () => this.closeLevelUpModal();
  }

  // ==================== CANVAS PARTICLE BACKGROUND & CONFETTI ====================
  setupCanvases() {
    this.bgCanvas = document.getElementById('bgCanvas');
    if (this.bgCanvas) {
      this.bgCtx = this.bgCanvas.getContext('2d');
      this.resizeCanvas(this.bgCanvas);
      this.initBgParticles();
    }

    this.confettiCanvas = document.getElementById('confettiCanvas');
    if (this.confettiCanvas) {
      this.confettiCtx = this.confettiCanvas.getContext('2d');
      this.resizeCanvas(this.confettiCanvas);
    }

    window.addEventListener('resize', () => {
      if (this.bgCanvas) this.resizeCanvas(this.bgCanvas);
      if (this.confettiCanvas) this.resizeCanvas(this.confettiCanvas);
    });

    this.animate();
  }

  resizeCanvas(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  initBgParticles() {
    this.particles = [];
    const count = Math.min(35, Math.floor(window.innerWidth / 12));
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? 'rgba(0, 242, 254,' : 'rgba(255, 0, 122,'
      });
    }
  }

  triggerConfetti() {
    if (!this.confettiCanvas) return;
    const colors = ['#00F2FE', '#FF007A', '#00FF87', '#FFB800', '#FFFFFF', '#7928CA'];
    for (let i = 0; i < 70; i++) {
      this.confettiParticles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight * 0.45,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.8) * 16,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        life: 1.0,
        decay: Math.random() * 0.015 + 0.012
      });
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Render BG Particles
    if (this.bgCtx && this.bgCanvas) {
      this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
      const w = this.bgCanvas.width;
      const h = this.bgCanvas.height;

      // Draw and connect particles
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        this.bgCtx.beginPath();
        this.bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.bgCtx.fillStyle = p.color + ' 0.4)';
        this.bgCtx.fill();

        // Connect near particles
        for (let j = i + 1; j < this.particles.length; j++) {
          const p2 = this.particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 80) {
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(p.x, p.y);
            this.bgCtx.lineTo(p2.x, p2.y);
            this.bgCtx.strokeStyle = `rgba(0, 242, 254, ${(1 - dist / 80) * 0.15})`;
            this.bgCtx.stroke();
          }
        }
      }
    }

    // Render Confetti
    if (this.confettiCtx && this.confettiCanvas && this.confettiParticles.length > 0) {
      this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);

      for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
        const c = this.confettiParticles[i];
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.35; // gravity
        c.rotation += c.rotSpeed;
        c.life -= c.decay;

        if (c.life <= 0) {
          this.confettiParticles.splice(i, 1);
          continue;
        }

        this.confettiCtx.save();
        this.confettiCtx.translate(c.x, c.y);
        this.confettiCtx.rotate((c.rotation * Math.PI) / 180);
        this.confettiCtx.globalAlpha = c.life;
        this.confettiCtx.fillStyle = c.color;
        this.confettiCtx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
        this.confettiCtx.restore();
      }
    }
  }
}

// Instantiate global app controller
window.appController = new AppController();
window.addEventListener('DOMContentLoaded', () => {
  window.appController.init();
});
