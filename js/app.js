// Variáveis globais
const soundCards = document.querySelectorAll('.sound-card');
const timerButtons = document.querySelectorAll('.timer-btn');
const timerDisplay = document.getElementById('timer-value');
const themeToggle = document.querySelector('.theme-toggle');
const activeSoundsBar = document.querySelector('.active-sounds-bar');
const activeSoundsContainer = document.querySelector('.active-sounds-container');

// Armazenar os sons ativos
let activeSounds = [];
let timerInterval = null;
let timerValue = 0; // em minutos

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSoundCards();
    initTimerButtons();
    checkOnlineStatus();
});

// Verificar status online/offline
function checkOnlineStatus() {
    function updateOnlineStatus() {
        const offlineIndicator = document.querySelector('.offline-indicator') || createOfflineIndicator();
        
        if (navigator.onLine) {
            offlineIndicator.classList.remove('visible');
        } else {
            offlineIndicator.classList.add('visible');
        }
    }
    
    function createOfflineIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'offline-indicator';
        indicator.textContent = 'Você está offline';
        document.body.appendChild(indicator);
        return indicator;
    }
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
}

// Inicializar tema
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    themeToggle.addEventListener('click', toggleTheme);
}

// Alternar tema claro/escuro
function toggleTheme() {
    if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// Inicializar cards de som
function initSoundCards() {
    soundCards.forEach(card => {
        card.addEventListener('click', toggleSound);
        
        // Evitar que o ajuste de volume ative/desative o som
        const volumeSlider = card.querySelector('.volume-slider');
        volumeSlider.addEventListener('input', adjustVolume);
        volumeSlider.addEventListener('click', e => e.stopPropagation());
    });
}

// Inicializar botões do timer
function initTimerButtons() {
    timerButtons.forEach(button => {
        button.addEventListener('click', setTimer);
    });
}

// Alternar reprodução de som
function toggleSound(e) {
    const card = e.currentTarget;
    const soundFile = card.dataset.sound;
    const soundName = card.querySelector('h3').textContent;
    const volumeSlider = card.querySelector('.volume-slider');
    const volume = volumeSlider.value / 100;
    
    // Verificar se o som já está ativo
    const existingSound = activeSounds.find(sound => sound.file === soundFile);
    
    if (existingSound) {
        // Desativar som
        card.classList.remove('active');
        existingSound.audio.pause();
        existingSound.audio.currentTime = 0;
        activeSounds = activeSounds.filter(sound => sound.file !== soundFile);
        
        // Remover da barra de sons ativos
        const activeItem = document.querySelector(`.active-sound-item[data-sound="${soundFile}"]`);
        if (activeItem) {
            activeItem.remove();
        }
    } else {
        // Ativar som
        card.classList.add('active');
        
        // Criar elemento de áudio
        const audio = new Audio(`assets/${soundFile}`);
        audio.loop = true;
        audio.volume = volume;
        audio.play().catch(error => {
            console.error('Erro ao reproduzir áudio:', error);
            alert('Não foi possível reproduzir o áudio. Verifique se o arquivo existe.');
            card.classList.remove('active');
        });
        
        // Adicionar à lista de sons ativos
        activeSounds.push({
            file: soundFile,
            name: soundName,
            audio: audio,
            card: card
        });
        
        // Adicionar à barra de sons ativos
        addToActiveSoundsBar(soundFile, soundName);
    }
    
    // Mostrar ou ocultar a barra de sons ativos
    updateActiveSoundsBar();
}

// Adicionar som à barra de sons ativos
function addToActiveSoundsBar(soundFile, soundName) {
    const iconClass = getIconClassForSound(soundFile);
    
    const activeItem = document.createElement('div');
    activeItem.className = 'active-sound-item';
    activeItem.dataset.sound = soundFile;
    activeItem.innerHTML = `
        <div class="active-sound-icon">
            <i class="${iconClass}"></i>
        </div>
        <div class="active-sound-name">${soundName}</div>
    `;
    
    activeSoundsContainer.appendChild(activeItem);
}

// Obter classe de ícone com base no nome do arquivo
function getIconClassForSound(soundFile) {
    if (soundFile.includes('Noise')) return 'fas fa-wave-square';
    if (soundFile.includes('rain') || soundFile.includes('Rain')) return 'fas fa-cloud-rain';
    if (soundFile.includes('thunder') || soundFile.includes('Thunder')) return 'fas fa-bolt';
    if (soundFile.includes('Forest') || soundFile.includes('forest')) return 'fas fa-tree';
    if (soundFile.includes('Bird') || soundFile.includes('bird')) return 'fas fa-dove';
    if (soundFile.includes('Crickets')) return 'fas fa-moon';
    if (soundFile.includes('piano') || soundFile.includes('Piano') || soundFile.includes('music')) return 'fas fa-music';
    if (soundFile.includes('car') || soundFile.includes('Car')) return 'fas fa-car';
    if (soundFile.includes('Subway') || soundFile.includes('metro')) return 'fas fa-subway';
    
    return 'fas fa-volume-up'; // Ícone padrão
}

// Atualizar barra de sons ativos
function updateActiveSoundsBar() {
    if (activeSounds.length > 0) {
        activeSoundsBar.classList.add('visible');
    } else {
        activeSoundsBar.classList.remove('visible');
    }
}

// Ajustar volume
function adjustVolume(e) {
    e.stopPropagation();
    const volumeSlider = e.target;
    const card = volumeSlider.closest('.sound-card');
    const soundFile = card.dataset.sound;
    const volume = volumeSlider.value / 100;
    
    // Encontrar o som ativo correspondente e ajustar o volume
    const activeSound = activeSounds.find(sound => sound.file === soundFile);
    if (activeSound) {
        activeSound.audio.volume = volume;
    }
}

// Configurar timer
function setTimer(e) {
    const minutes = parseInt(e.target.dataset.time);
    
    // Limpar timer anterior
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    if (minutes === 0) {
        // Cancelar timer
        timerValue = 0;
        timerDisplay.textContent = '∞';
        return;
    }
    
    // Configurar novo timer
    timerValue = minutes;
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timerValue--;
        updateTimerDisplay();
        
        if (timerValue <= 0) {
            // Timer concluído, parar todos os sons
            stopAllSounds();
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }, 60000); // Atualizar a cada minuto
}

// Atualizar exibição do timer
function updateTimerDisplay() {
    timerDisplay.textContent = timerValue;
}

// Parar todos os sons
function stopAllSounds() {
    activeSounds.forEach(sound => {
        sound.audio.pause();
        sound.audio.currentTime = 0;
        sound.card.classList.remove('active');
    });
    
    activeSounds = [];
    activeSoundsContainer.innerHTML = '';
    updateActiveSoundsBar();
}

// Garantir que os sons continuem tocando mesmo com a tela desligada
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        // Quando a página está em segundo plano ou a tela está desligada
        // Podemos usar um service worker ou uma estratégia para manter o áudio tocando
        if ('wakeLock' in navigator) {
            try {
                navigator.wakeLock.request('screen').then(wakeLock => {
                    console.log('Wake Lock ativado');
                    
                    document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'visible') {
                            wakeLock.release();
                            console.log('Wake Lock liberado');
                        }
                    });
                });
            } catch (err) {
                console.error('Wake Lock não suportado:', err);
            }
        }
    }
});
