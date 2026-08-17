/**
 * CHAN - Procedural Web Audio Synthesizer & Haptics Engine
 * Provides futuristic cyber sound effects without any external audio asset dependencies.
 */

class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
    this.hapticsEnabled = true;
    this.volume = 0.7;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  vibrate(pattern = 15) {
    if (this.hapticsEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignored if browser restricts vibration
      }
    }
  }

  // Generic tone generator
  playTone(freq, type = 'sine', duration = 0.1, startVol = 0.5, endVol = 0.001) {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(startVol * this.volume, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(endVol, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio tone error:', e);
    }
  }

  // Futuristic Keypad / Click
  playClick() {
    this.vibrate(12);
    this.playTone(880, 'sine', 0.04, 0.3);
  }

  // Enter Protocol / Power Up
  playPowerUp() {
    if (!this.soundEnabled) return;
    this.init();
    this.vibrate([30, 40, 60]);
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.01, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4 * this.volume, this.audioCtx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.55);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.55);
    } catch (e) {}
  }

  // Holographic Unlock Success
  playUnlock() {
    this.vibrate([20, 30, 40]);
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.15, 0.4);
      }, idx * 60);
    });
  }

  // Access Denied / Error
  playError() {
    this.vibrate([60, 50, 60]);
    this.playTone(150, 'sawtooth', 0.18, 0.5);
    setTimeout(() => {
      this.playTone(110, 'sawtooth', 0.22, 0.5);
    }, 90);
  }

  // Quest Set Checked
  playQuestCheck() {
    this.vibrate(25);
    this.playTone(659.25, 'sine', 0.08, 0.4); // E5
    setTimeout(() => {
      this.playTone(987.77, 'triangle', 0.12, 0.5); // B5
    }, 70);
  }

  // All Quests Completed Fanfare
  playQuestComplete() {
    this.vibrate([40, 50, 40, 50, 100]);
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    chord.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.4, 0.45);
      }, idx * 75);
    });
  }

  // Level Up Arpeggio
  playLevelUp() {
    this.vibrate([50, 50, 80, 50, 150]);
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51, 1760];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.25, 0.5);
      }, idx * 80);
    });
  }

  // Countdown Beep (3, 2, 1)
  playCountdownBeep(isFinal = false) {
    if (isFinal) {
      this.vibrate([100, 50, 200]);
      this.playTone(1760, 'triangle', 0.5, 0.6); // High A6
    } else {
      this.vibrate(30);
      this.playTone(880, 'sine', 0.12, 0.4); // A5
    }
  }

  // Interval Switch (HIIT Work / Rest)
  playIntervalBell(isWork = true) {
    this.vibrate([50, 30, 80]);
    if (isWork) {
      this.playTone(1046.5, 'triangle', 0.35, 0.55); // High Work Start
    } else {
      this.playTone(440, 'sine', 0.35, 0.45); // Rest Start
    }
  }
}

// Global Sound Singleton
window.audioEngine = new SoundEngine();
