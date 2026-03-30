// public/js/components/audioSystem.js
(function() {
    if (window.__audioSystemLoaded) {
        console.log('🎵 Audio system already loaded');
        return;
    }
    window.__audioSystemLoaded = true;
    
    const AudioSystemInstance = {
        enabled: true,
        correctAudioList: [],
        correctAudioLoaded: false,
        
        async init() {
            console.log('🎵 Audio system initializing...');
            await this.loadCorrectAudios();
            console.log('🎵 Audio system ready');
            return this;
        },
        
        async loadCorrectAudios() {
            try {
                const response = await fetch('/api/audio/correct/list');
                if (response.ok) {
                    const data = await response.json();
                    this.correctAudioList = data.files;
                    console.log(`🎵 Loaded ${this.correctAudioList.length} correct audio files:`, this.correctAudioList);
                } else {
                    throw new Error('Server returned error');
                }
            } catch (err) {
                console.warn('Could not load correct audio list, using fallback');
                this.correctAudioList = ['Great.mp3', 'Excellent.mp3', 'Perfect.mp3', 'Amazing.mp3', 'Awesome.mp3'];
            }
            this.correctAudioLoaded = true;
        },
        
        // Play random correct answer sound
        async playCorrectRandom() {
            if (!this.enabled) return;
            
            if (!this.correctAudioLoaded) {
                await this.loadCorrectAudios();
            }
            
            if (this.correctAudioList.length === 0) {
                return;
            }
            
            const randomIndex = Math.floor(Math.random() * this.correctAudioList.length);
            const fileName = this.correctAudioList[randomIndex];
            
            try {
                const audio = new Audio(`/multimedia_assets/audios/correct/${fileName}`);
                audio.volume = 0.7;
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(err => {
                        console.warn(`Failed to play ${fileName}:`, err);
                    });
                }
                return fileName.replace('.mp3', ''); // Return word for text flash
            } catch (err) {
                console.warn(`Error creating audio for ${fileName}:`, err);
                return null;
            }
        },
        
        playWrong() {
            try {
                const audio = new Audio(`/multimedia_assets/audios/error-mistake.mp3`);
                audio.volume = 0.5;
                audio.play().catch(() => {});
            } catch (err) {}
        },
        
        playClick() {
            try {
                const audio = new Audio(`/multimedia_assets/audios/ui-click.mp3`);
                audio.volume = 0.3;
                audio.play().catch(() => {});
            } catch (err) {}
        },
        
        playCoinCollect() {
            try {
                const audio = new Audio(`/multimedia_assets/audios/collect-points.mp3`);
                audio.volume = 0.5;
                audio.play().catch(() => {});
            } catch (err) {}
        },
        
        playCoinDeduct() {
            try {
                const audio = new Audio(`/multimedia_assets/audios/whoosh.mp3`);
                audio.volume = 0.4;
                audio.play().catch(() => {});
            } catch (err) {}
        }
    };
    
    window.MANYAAudioSystem = AudioSystemInstance;
    window.AudioSystem = AudioSystemInstance;
})();