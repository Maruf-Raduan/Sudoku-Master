class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = this.loadSoundPreference();
        this.initAudioContext();
    }
    
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }
    
    loadSoundPreference() {
        try {
            const pref = localStorage.getItem('sudokuSoundEnabled');
            return pref === null ? true : pref === 'true';
        } catch (_) {
            return true;
        }
    }
    
    saveSoundPreference() {
        try {
            localStorage.setItem('sudokuSoundEnabled', this.enabled);
        } catch (_) {}
    }
    
    toggle() {
        this.enabled = !this.enabled;
        this.saveSoundPreference();
        return this.enabled;
    }
    
    playTone(frequency, duration, volume = 0.1, type = 'sine') {
        if (!this.enabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    cellClick() {
        this.playTone(800, 0.05, 0.08, 'sine');
    }
    
    numberPlaced() {
        this.playTone(1200, 0.08, 0.1, 'sine');
        setTimeout(() => this.playTone(1400, 0.06, 0.08, 'sine'), 40);
    }
    
    error() {
        this.playTone(300, 0.15, 0.12, 'sawtooth');
        setTimeout(() => this.playTone(250, 0.15, 0.1, 'sawtooth'), 80);
    }
    
    hint() {
        this.playTone(1000, 0.1, 0.09, 'triangle');
        setTimeout(() => this.playTone(1200, 0.1, 0.09, 'triangle'), 60);
        setTimeout(() => this.playTone(1400, 0.1, 0.09, 'triangle'), 120);
    }
    
    complete() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 0.12, 'sine'), i * 100);
        });
    }
    
    pause() {
        this.playTone(600, 0.12, 0.1, 'sine');
        setTimeout(() => this.playTone(500, 0.12, 0.08, 'sine'), 80);
    }
    
    resume() {
        this.playTone(500, 0.12, 0.08, 'sine');
        setTimeout(() => this.playTone(600, 0.12, 0.1, 'sine'), 80);
    }
}
