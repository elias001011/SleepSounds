// Variáveis globais
const soundCards = document.querySelectorAll('.sound-card');
const timerButtons = document.querySelectorAll('.timer-btn');
const timerDisplay = document.getElementById('timer-value');
const themeToggle = document.querySelector('.theme-toggle');
const activeSoundsBar = document.querySelector('.active-sounds-bar');
const activeSoundsContainer = document.querySelector('.active-sounds-container');

// Armazenar os sons ativos
let activeSounds = []; // Array para guardar informações sobre os sons ativos
let timerInterval = null;
let timerValue = 0; // em segundos

// Constantes para o efeito de fade
const FADE_DURATION = 1000; // Duração do fade em milissegundos (0.5 segundos)
const FADE_STEPS = 20;     // Número de passos para o fade

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSoundCards();
    initTimerButtons();
    checkOnlineStatus();
});

// Verificar status online/offline (sem alterações)
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

// Inicializar tema (sem alterações)
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    themeToggle.addEventListener('click', toggleTheme);
}

// Alternar tema claro/escuro (sem alterações)
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

// Inicializar cards de som (sem alterações)
function initSoundCards() {
    soundCards.forEach(card => {
        card.addEventListener('click', toggleSound);
        const volumeSlider = card.querySelector('.volume-slider');
        volumeSlider.addEventListener('input', adjustVolume);
        volumeSlider.addEventListener('click', e => e.stopPropagation());
    });
}

// Inicializar botões do timer (sem alterações)
function initTimerButtons() {
    timerButtons.forEach(button => {
        button.addEventListener('click', setTimer);
    });
}

// --- FUNÇÕES DE FADE ---
// Função auxiliar para limpar intervalos de fade
function clearFadeInterval(sound) {
    if (sound.fadeInterval) {
        clearInterval(sound.fadeInterval);
        sound.fadeInterval = null;
    }
}

// Função para fade-in
function fadeIn(sound, targetVol) {
    clearFadeInterval(sound); // Limpa fade anterior
    sound.isFadingOut = false;
    sound.audio.volume = 0; // Garante que começa do 0
    let currentVolume = 0;
    const step = targetVol / FADE_STEPS;
    const intervalTime = FADE_DURATION / FADE_STEPS;

    sound.fadeInterval = setInterval(() => {
        currentVolume += step;
        if (currentVolume >= targetVol) {
            sound.audio.volume = targetVol; // Define o volume final exato
            clearFadeInterval(sound);       // Limpa o intervalo
        } else {
            sound.audio.volume = currentVolume;
        }
    }, intervalTime);
}

// Função para fade-out
function fadeOut(sound) {
    clearFadeInterval(sound); // Limpa fade anterior
    sound.isFadingOut = true; // Marca que está em fade-out
    let currentVolume = sound.audio.volume; // Começa do volume atual
    // Evita dividir por zero se o volume já for 0
    const step = currentVolume > 0 ? currentVolume / FADE_STEPS : 0;
    const intervalTime = FADE_DURATION / FADE_STEPS;

     // Se o passo for 0 (volume já é 0), não faz nada
    if (step <= 0) {
        sound.isFadingOut = false; // Reseta a flag se já estava no 0
        return;
    }

    sound.fadeInterval = setInterval(() => {
        currentVolume -= step;
        if (currentVolume <= 0) {
            sound.audio.volume = 0; // Define o volume final como 0
            clearFadeInterval(sound);
            // Não reseta isFadingOut aqui, o evento 'ended' cuidará disso
        } else {
            sound.audio.volume = currentVolume;
        }
    }, intervalTime);
}
// --- FIM DAS FUNÇÕES DE FADE ---

// Alternar reprodução de som (MODIFICADO)
function toggleSound(e) {
    const card = e.currentTarget;
    const soundFile = card.dataset.sound;
    const soundName = card.querySelector('h3').textContent;
    const volumeSlider = card.querySelector('.volume-slider');
    const initialVolume = volumeSlider.value / 100; // Volume definido pelo usuário

    const existingSoundIndex = activeSounds.findIndex(sound => sound.file === soundFile);

    if (existingSoundIndex !== -1) {
        // Desativar som
        const existingSound = activeSounds[existingSoundIndex];
        card.classList.remove('active');
        clearFadeInterval(existingSound); // IMPORTANTE: parar qualquer fade em andamento
        existingSound.audio.pause();
        existingSound.audio.currentTime = 0;
        // Remover listeners para evitar memory leaks (boa prática, mas requer mais complexidade para guardar referências)
        // existingSound.audio.removeEventListener('ended', handleAudioEnd);
        // existingSound.audio.removeEventListener('timeupdate', handleAudioTimeUpdate);
        activeSounds.splice(existingSoundIndex, 1); // Remove da lista

        const activeItem = document.querySelector(`.active-sound-item[data-sound="${soundFile}"]`);
        if (activeItem) {
            activeItem.remove();
        }
    } else {
        // Ativar som
        card.classList.add('active');
        const audio = new Audio(`assets/${soundFile}`);
        // audio.loop = true; // REMOVIDO - Não usamos mais o loop nativo

        // Objeto para guardar dados do som ativo
        const soundData = {
            file: soundFile,
            name: soundName,
            audio: audio,
            card: card,
            targetVolume: initialVolume, // Volume desejado pelo usuário
            fadeInterval: null,          // ID do intervalo de fade
            isFadingOut: false         // Flag para controlar o fade-out
        };

        // Adiciona listeners ANTES de adicionar ao array e tocar
        // Listener para quando o áudio terminar (para fazer o loop com fade)
        const handleAudioEnd = () => {
            const sound = activeSounds.find(s => s.audio === audio);
            if (sound) {
                sound.isFadingOut = false; // Reseta a flag de fade-out
                audio.currentTime = 0;     // Reinicia o tempo
                audio.volume = 0;          // Começa com volume 0 para o fade-in
                audio.play().then(() => {
                    // Inicia o fade-in para o volume alvo do usuário
                    fadeIn(sound, sound.targetVolume);
                }).catch(e => console.error("Erro ao reiniciar áudio:", e));
            }
        };
        audio.addEventListener('ended', handleAudioEnd);

        // Listener para verificar o tempo e iniciar o fade-out
        const handleAudioTimeUpdate = () => {
            const sound = activeSounds.find(s => s.audio === audio);
            // Verifica se o som existe, tem duração e não está em fade-out
            if (sound && audio.duration && !sound.isFadingOut) {
                const timeRemaining = audio.duration - audio.currentTime;
                // Inicia fade-out X ms antes do fim (X = FADE_DURATION)
                if (timeRemaining < (FADE_DURATION / 1000.0)) {
                    fadeOut(sound);
                }
            }
        };
        audio.addEventListener('timeupdate', handleAudioTimeUpdate);

        // Adiciona o som à lista de sons ativos
        activeSounds.push(soundData);

        // Inicia com volume 0 e faz fade-in inicial
        audio.volume = 0;
        audio.play().then(() => {
            fadeIn(soundData, initialVolume); // Inicia o primeiro fade-in
        }).catch(error => {
            console.error('Erro ao reproduzir áudio:', error);
            alert('Não foi possível reproduzir o áudio. Verifique se o arquivo existe e tente novamente.');
            card.classList.remove('active');
            // Remove da lista se falhar ao tocar
            activeSounds = activeSounds.filter(s => s.file !== soundFile);
            updateActiveSoundsBar(); // Atualiza a barra caso a adição falhe
        });

        addToActiveSoundsBar(soundFile, soundName);
    }

    updateActiveSoundsBar();
}

// Adicionar som à barra de sons ativos (sem alterações)
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

// Obter classe de ícone (sem alterações)
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

// Atualizar barra de sons ativos (sem alterações)
function updateActiveSoundsBar() {
    if (activeSounds.length > 0) {
        activeSoundsBar.classList.add('visible');
    } else {
        activeSoundsBar.classList.remove('visible');
    }
}

// Ajustar volume (MODIFICADO)
function adjustVolume(e) {
    e.stopPropagation();
    const volumeSlider = e.target;
    const card = volumeSlider.closest('.sound-card');
    const soundFile = card.dataset.sound;
    const newVolume = volumeSlider.value / 100; // Novo volume alvo

    const activeSound = activeSounds.find(sound => sound.file === soundFile);
    if (activeSound) {
        activeSound.targetVolume = newVolume; // Atualiza o volume alvo

        // Se não estiver em processo de fade, ajusta o volume imediatamente
        // Se estiver em fade-out, deixa continuar (ele vai para 0 de qualquer forma)
        // Se estiver em fade-in, ele continuará até o volume alvo antigo.
        // Poderíamos interromper o fade-in e iniciar um novo para o newVolume,
        // mas manter assim é mais simples e geralmente aceitável.
        if (!activeSound.fadeInterval) {
            activeSound.audio.volume = newVolume;
        }
    }
}

// Configurar timer (sem alterações)
function setTimer(e) {
    const minutes = parseInt(e.target.dataset.time);
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (minutes === 0) {
        timerValue = 0;
        timerDisplay.textContent = '∞';
        // Garante que o texto 'minutos' seja exibido corretamente ou ocultado
         timerDisplay.nextElementSibling.style.display = 'none'; // Oculta 'minutos'
        return;
    }
     timerDisplay.nextElementSibling.style.display = 'inline'; // Mostra 'minutos'

    timerValue = minutes * 60;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timerValue--;
        updateTimerDisplay();
        if (timerValue <= 0) {
            stopAllSounds();
            clearInterval(timerInterval);
            timerInterval = null;
            timerDisplay.textContent = '∞';
             timerDisplay.nextElementSibling.style.display = 'none'; // Oculta 'minutos'
        }
    }, 1000);
}

// Atualizar exibição do timer (MODIFICADO para exibir 'minutos' corretamente)
function updateTimerDisplay() {
    if (timerValue > 0) {
        const minutes = Math.floor(timerValue / 60);
        const seconds = timerValue % 60;
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        timerDisplay.nextElementSibling.style.display = 'inline'; // Mostra 'minutos'
    } else {
        // Se o timer não estiver ativo ou acabou, mostra infinito e esconde 'minutos'
        timerDisplay.textContent = '∞';
        timerDisplay.nextElementSibling.style.display = 'none';
    }
}


// Parar todos os sons (MODIFICADO para limpar intervalos de fade)
function stopAllSounds() {
    activeSounds.forEach(sound => {
        clearFadeInterval(sound); // IMPORTANTE: parar fades antes de pausar
        sound.audio.pause();
        sound.audio.currentTime = 0;
        sound.card.classList.remove('active');
        // Idealmente, remover listeners aqui também
    });
    activeSounds = [];
    activeSoundsContainer.innerHTML = '';
    updateActiveSoundsBar();
     // Garante que o display do timer seja atualizado para '∞' se ele zerou
    if (timerValue <= 0) {
       updateTimerDisplay();
    }
}

// Wake Lock (sem alterações, mas sua eficácia pode variar entre navegadores/dispositivos)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        if ('wakeLock' in navigator) {
            try {
                navigator.wakeLock.request('screen').then(wakeLock => {
                    console.log('Wake Lock ativado (tentativa)');
                    // Libera o wake lock quando a página volta a ser visível
                    document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'visible' && wakeLock) {
                            wakeLock.release().then(() => {
                                console.log('Wake Lock liberado');
                                wakeLock = null; // Limpa a referência
                            });
                        }
                    }, { once: true }); // Usa once para evitar múltiplos listeners
                }).catch(err => {
                     // É comum falhar se não for uma interação do usuário ou HTTPS
                    console.warn('Solicitação de Wake Lock falhou:', err);
                });
            } catch (err) {
                console.error('Wake Lock API não suportada ou erro:', err);
            }
        }
    }
});

// Garante que o estado inicial do timer display esteja correto
document.addEventListener('DOMContentLoaded', () => {
    updateTimerDisplay(); // Chama no início para garantir que 'minutos' está oculto
});
