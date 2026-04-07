// public/js/components/audioSystem.js
(function() {
    if (window.__audioSystemLoaded) {
        console.log('🎵 Audio system already loaded');
        return;
    }
    window.__audioSystemLoaded = true;
    
    const AudioSystemInstance = {
        enabled: true,
        audioLists: {
            correct: [],
            wrong: [],
            quest_complete: []
        },
        loaded: {
            correct: false,
            wrong: false,
            quest_complete: false
        },
        lastPlayedTime: 0,
        
        async init() {
            console.log('🎵 Audio system initializing...');
            await this.loadAllAudios();
            console.log('🎵 Audio system ready');
            return this;
        },
        
        async loadAllAudios() {
            const folders = ['correct', 'wrong', 'quest_complete'];
            for (const folder of folders) {
                await this.loadAudios(folder);
            }
        },
        
        async loadAudios(folder) {
            try {
                const response = await fetch(`/api/audio/${folder}/list`);
                if (response.ok) {
                    const data = await response.json();
                    this.audioLists[folder] = data.files;
                    if (data.files.length === 0) {
                        console.log(`⚠️ No audio files found in ${folder} folder`);
                    } else {
                        console.log(`🎵 Loaded ${this.audioLists[folder].length} audio files from ${folder}`);
                    }
                } else {
                    throw new Error('Server returned error');
                }
            } catch (err) {
                console.warn(`Could not load ${folder} audio list:`, err);
                this.audioLists[folder] = [];
            }
            this.loaded[folder] = true;
        },
        
        // Play random sound from correct folder - prevents duplicate within 500ms
        async playCorrect() {
            if (!this.enabled) return null;
            
            // Prevent duplicate plays within 500ms
            const now = Date.now();
            if (now - this.lastPlayedTime < 500) {
                console.log('🎵 Skipping duplicate correct sound');
                return null;
            }
            this.lastPlayedTime = now;
            
            if (!this.loaded.correct) {
                await this.loadAudios('correct');
            }
            
            const audioList = this.audioLists.correct;
            if (!audioList || audioList.length === 0) {
                console.log('⚠️ No correct audio files found');
                return null;
            }
            
            const randomIndex = Math.floor(Math.random() * audioList.length);
            const fileName = audioList[randomIndex];
            const word = fileName.replace('.mp3', '');
            
            console.log(`🎵 Playing correct: ${fileName} (${word})`);
            
            try {
                const audio = new Audio(`/multimedia_assets/audios/correct/${fileName}`);
                audio.volume = 0.7;
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(err => {
                        console.warn(`Failed to play ${fileName}:`, err);
                    });
                }
                return word;
            } catch (err) {
                console.warn(`Error playing correct audio:`, err);
                return null;
            }
        },
        
        // Play single error sound
        playWrong() {
            if (!this.enabled) return;
            
            try {
                const audio = new Audio(`/multimedia_assets/audios/error-mistake.mp3`);
                audio.volume = 0.5;
                audio.play().catch(err => {
                    console.warn('Failed to play error-mistake.mp3:', err);
                });
                console.log('🎵 Playing wrong: error-mistake.mp3');
            } catch (err) {
                console.warn('Error playing wrong audio:', err);
            }
        },
        
        // Play random sound from quest_complete folder
        async playQuestComplete() {
            if (!this.enabled) return null;
            
            if (!this.loaded.quest_complete) {
                await this.loadAudios('quest_complete');
            }
            
            const audioList = this.audioLists.quest_complete;
            if (!audioList || audioList.length === 0) {
                console.log('⚠️ No quest_complete audio files found');
                return null;
            }
            
            const randomIndex = Math.floor(Math.random() * audioList.length);
            const fileName = audioList[randomIndex];
            const word = fileName.replace('.mp3', '');
            
            console.log(`🎵 Playing quest_complete: ${fileName} (${word})`);
            
            try {
                const audio = new Audio(`/multimedia_assets/audios/quest_complete/${fileName}`);
                audio.volume = 0.8;
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(err => {
                        console.warn(`Failed to play ${fileName}:`, err);
                    });
                }
                return word;
            } catch (err) {
                console.warn(`Error playing quest_complete audio:`, err);
                return null;
            }
        },
        
        // UI Sounds
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
        },
        
        playGemCollect() {
            try {
                const audio = new Audio(`/multimedia_assets/audios/collect-points.mp3`);
                audio.volume = 0.5;
                audio.play().catch(() => {});
            } catch (err) {}
        }
    };
    
    window.MANYAAudioSystem = AudioSystemInstance;
    window.AudioSystem = AudioSystemInstance;
})();