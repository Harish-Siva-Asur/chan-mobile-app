/**
 * CHAN - Chrono Engine (Multi-Mode Precision Timer)
 * Supports 20-Min Daily Quest, Custom Countdown, Stopwatch with Laps, and HIIT/Tabata Intervals.
 */

class ChronoEngine {
  constructor() {
    this.mode = 'quest'; // 'quest' | 'custom' | 'stopwatch' | 'hiit'
    this.isRunning = false;
    this.timerInterval = null;

    // Quest / Custom State
    this.totalSeconds = 1200; // 20:00 default
    this.initialSeconds = 1200;

    // Stopwatch State
    this.stopwatchMs = 0;
    this.laps = [];

    // HIIT State
    this.hiitWorkSec = 20;
    this.hiitRestSec = 10;
    this.hiitTotalRounds = 8;
    this.hiitCurrentRound = 1;
    this.hiitState = 'work'; // 'work' | 'rest'
    this.hiitTimeInPhase = 20;

    // SVG Dial Constants
    this.CIRCUMFERENCE = 691.15; // 2 * PI * 110
  }

  init() {
    this.bindEvents();
    this.setMode('quest');
    this.updateUI();
  }

  bindEvents() {
    // Mode Switcher buttons
    document.querySelectorAll('.mode-tab-btn').forEach(btn => {
      btn.onclick = () => {
        const mode = btn.dataset.mode;
        this.setMode(mode);
      };
    });

    const btnPlay = document.getElementById('btnTimerPlay');
    if (btnPlay) {
      btnPlay.onclick = () => this.togglePlay();
    }

    const btnReset = document.getElementById('btnTimerReset');
    if (btnReset) {
      btnReset.onclick = () => this.reset();
    }

    const btnLap = document.getElementById('btnTimerLap');
    if (btnLap) {
      btnLap.onclick = () => this.recordLap();
    }

    // Preset adjustment buttons
    const btnAdd1 = document.getElementById('btnAdd1Min');
    if (btnAdd1) btnAdd1.onclick = () => this.adjustTime(60);

    const btnAdd5 = document.getElementById('btnAdd5Min');
    if (btnAdd5) btnAdd5.onclick = () => this.adjustTime(300);

    const btnSub1 = document.getElementById('btnSub1Min');
    if (btnSub1) btnSub1.onclick = () => this.adjustTime(-60);
  }

  setMode(newMode) {
    this.pause();
    this.mode = newMode;

    // Update tab UI
    document.querySelectorAll('.mode-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === newMode);
    });

    const lapsBox = document.getElementById('lapsContainer');
    const chipsBox = document.getElementById('timerChipsRow');
    const labelElem = document.getElementById('timerDialLabel');
    const subStatElem = document.getElementById('timerDialSubStat');

    if (this.mode === 'quest') {
      this.totalSeconds = 1200;
      this.initialSeconds = 1200;
      if (labelElem) labelElem.innerText = 'QUEST PROTOCOL';
      if (subStatElem) subStatElem.innerText = 'TARGET: 20:00';
      if (lapsBox) lapsBox.style.display = 'none';
      if (chipsBox) chipsBox.style.display = 'flex';
    } else if (this.mode === 'custom') {
      this.totalSeconds = 300;
      this.initialSeconds = 300;
      if (labelElem) labelElem.innerText = 'CUSTOM COUNTDOWN';
      if (subStatElem) subStatElem.innerText = 'CONFIGURED TIME';
      if (lapsBox) lapsBox.style.display = 'none';
      if (chipsBox) chipsBox.style.display = 'flex';
    } else if (this.mode === 'stopwatch') {
      this.stopwatchMs = 0;
      this.laps = [];
      this.renderLaps();
      if (labelElem) labelElem.innerText = 'CHRONO STOPWATCH';
      if (subStatElem) subStatElem.innerText = 'LAP TIME';
      if (lapsBox) lapsBox.style.display = 'flex';
      if (chipsBox) chipsBox.style.display = 'none';
    } else if (this.mode === 'hiit') {
      this.hiitCurrentRound = 1;
      this.hiitState = 'work';
      this.hiitTimeInPhase = this.hiitWorkSec;
      if (labelElem) labelElem.innerText = 'HIIT TABATA';
      if (subStatElem) subStatElem.innerText = `ROUND 1 / ${this.hiitTotalRounds} (WORK)`;
      if (lapsBox) lapsBox.style.display = 'none';
      if (chipsBox) chipsBox.style.display = 'none';
    }

    this.updateUI();
    window.audioEngine.playClick();
  }

  togglePlay() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    window.audioEngine.playClick();
    this.updatePlayButton();

    if (this.mode === 'stopwatch') {
      const startTime = Date.now() - this.stopwatchMs;
      this.timerInterval = setInterval(() => {
        this.stopwatchMs = Date.now() - startTime;
        this.updateUI();
      }, 33);
    } else if (this.mode === 'hiit') {
      this.timerInterval = setInterval(() => {
        this.tickHIIT();
      }, 1000);
    } else {
      // Countdown modes (Quest & Custom)
      this.timerInterval = setInterval(() => {
        if (this.totalSeconds > 0) {
          this.totalSeconds--;
          this.updateUI();

          if (this.totalSeconds <= 3 && this.totalSeconds > 0) {
            window.audioEngine.playCountdownBeep(false);
          }

          if (this.totalSeconds === 0) {
            this.pause();
            window.audioEngine.playCountdownBeep(true);
            window.appController.triggerConfetti();
            const xpGained = this.mode === 'quest' ? 150 : 50;
            window.appStorage.addXP(xpGained);
            window.appController.showToast(`🔥 CHRONO TIME FINISHED! +${xpGained} XP`);
            window.appController.updateHUD();
          }
        }
      }, 1000);
    }
  }

  pause() {
    this.isRunning = false;
    clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.updatePlayButton();
  }

  reset() {
    this.pause();
    if (this.mode === 'quest') {
      this.totalSeconds = 1200;
      this.initialSeconds = 1200;
    } else if (this.mode === 'custom') {
      this.totalSeconds = 300;
      this.initialSeconds = 300;
    } else if (this.mode === 'stopwatch') {
      this.stopwatchMs = 0;
      this.laps = [];
      this.renderLaps();
    } else if (this.mode === 'hiit') {
      this.hiitCurrentRound = 1;
      this.hiitState = 'work';
      this.hiitTimeInPhase = this.hiitWorkSec;
    }
    this.updateUI();
    window.audioEngine.playClick();
  }

  adjustTime(seconds) {
    if (this.mode === 'quest' || this.mode === 'custom') {
      this.totalSeconds = Math.max(10, this.totalSeconds + seconds);
      this.initialSeconds = Math.max(this.totalSeconds, this.initialSeconds);
      this.updateUI();
      window.audioEngine.playClick();
    }
  }

  tickHIIT() {
    this.hiitTimeInPhase--;

    if (this.hiitTimeInPhase <= 3 && this.hiitTimeInPhase > 0) {
      window.audioEngine.playCountdownBeep(false);
    }

    if (this.hiitTimeInPhase <= 0) {
      if (this.hiitState === 'work') {
        // Switch to rest
        this.hiitState = 'rest';
        this.hiitTimeInPhase = this.hiitRestSec;
        window.audioEngine.playIntervalBell(false);
      } else {
        // Switch to work next round
        this.hiitCurrentRound++;
        if (this.hiitCurrentRound > this.hiitTotalRounds) {
          // Finished HIIT workout!
          this.pause();
          window.audioEngine.playQuestComplete();
          window.appController.triggerConfetti();
          window.appStorage.addXP(200);
          window.appController.showToast("🏆 HIIT TABATA PROTOCOL COMPLETED! +200 XP");
          window.appController.updateHUD();
          return;
        }
        this.hiitState = 'work';
        this.hiitTimeInPhase = this.hiitWorkSec;
        window.audioEngine.playIntervalBell(true);
      }
    }

    this.updateUI();
  }

  recordLap() {
    if (this.mode === 'stopwatch' && this.stopwatchMs > 0) {
      this.laps.unshift(this.stopwatchMs);
      this.renderLaps();
      window.audioEngine.playClick();
    }
  }

  renderLaps() {
    const lapsBox = document.getElementById('lapsList');
    if (!lapsBox) return;
    lapsBox.innerHTML = '';

    this.laps.forEach((lapMs, idx) => {
      const lapItem = document.createElement('div');
      lapItem.className = 'lap-item';
      const m = Math.floor(lapMs / 60000).toString().padStart(2, '0');
      const s = Math.floor((lapMs % 60000) / 1000).toString().padStart(2, '0');
      const cs = Math.floor((lapMs % 1000) / 10).toString().padStart(2, '0');

      lapItem.innerHTML = `
        <span style="color:var(--cyan-primary);">LAP ${this.laps.length - idx}</span>
        <span>${m}:${s}.${cs}</span>
      `;
      lapsBox.appendChild(lapItem);
    });
  }

  updateUI() {
    const digitsElem = document.getElementById('timerDigits');
    const ringElem = document.getElementById('timerProgressRing');
    const subStatElem = document.getElementById('timerDialSubStat');

    if (this.mode === 'stopwatch') {
      const m = Math.floor(this.stopwatchMs / 60000).toString().padStart(2, '0');
      const s = Math.floor((this.stopwatchMs % 60000) / 1000).toString().padStart(2, '0');
      const cs = Math.floor((this.stopwatchMs % 1000) / 10).toString().padStart(2, '0');

      if (digitsElem) digitsElem.innerText = `${m}:${s}.${cs}`;
      if (ringElem) {
        // Continuous pulse ring for stopwatch
        const offset = (this.stopwatchMs % 60000) / 60000;
        ringElem.style.strokeDashoffset = (1 - offset) * this.CIRCUMFERENCE;
      }
    } else if (this.mode === 'hiit') {
      const s = this.hiitTimeInPhase.toString().padStart(2, '0');
      if (digitsElem) digitsElem.innerText = `00:${s}`;
      if (subStatElem) {
        const stateColor = this.hiitState === 'work' ? 'var(--emerald-primary)' : 'var(--pink-primary)';
        subStatElem.innerHTML = `<span style="color:${stateColor}">ROUND ${this.hiitCurrentRound}/${this.hiitTotalRounds} (${this.hiitState.toUpperCase()})</span>`;
      }
      if (ringElem) {
        const totalPhaseSec = this.hiitState === 'work' ? this.hiitWorkSec : this.hiitRestSec;
        const progress = this.hiitTimeInPhase / totalPhaseSec;
        ringElem.style.strokeDashoffset = (1 - progress) * this.CIRCUMFERENCE;
      }
    } else {
      // Quest & Custom Countdown
      const m = Math.floor(this.totalSeconds / 60).toString().padStart(2, '0');
      const s = (this.totalSeconds % 60).toString().padStart(2, '0');
      if (digitsElem) digitsElem.innerText = `${m}:${s}`;

      if (ringElem) {
        const progress = this.initialSeconds > 0 ? (this.totalSeconds / this.initialSeconds) : 0;
        ringElem.style.strokeDashoffset = (1 - progress) * this.CIRCUMFERENCE;
      }
    }
  }

  updatePlayButton() {
    const btnPlay = document.getElementById('btnTimerPlay');
    if (!btnPlay) return;

    if (this.isRunning) {
      btnPlay.classList.add('running');
      btnPlay.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      `;
    } else {
      btnPlay.classList.remove('running');
      btnPlay.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
    }
  }
}

window.chronoEngine = new ChronoEngine();
