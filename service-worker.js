// Service Worker para funcionalidade offline
const CACHE_NAME = 'sleep-sounds-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/manifest.json',
  // Ícones e imagens
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png',
  '/assets/favicon.ico'
  // Os arquivos de áudio serão adicionados dinamicamente
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retorna a resposta do cache
        if (response) {
          return response;
        }

        // Clonar a requisição
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Verificar se a resposta é válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar a resposta
            const responseToCache = response.clone();

            // Adicionar ao cache para uso futuro
            caches.open(CACHE_NAME)
              .then(cache => {
                // Armazenar arquivos de áudio e outros recursos
                if (event.request.url.includes('.mp3') || 
                    event.request.url.includes('.css') || 
                    event.request.url.includes('.js') || 
                    event.request.url.includes('.html') || 
                    event.request.url.includes('.png') || 
                    event.request.url.includes('.ico')) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          });
      })
      .catch(() => {
        // Falha na rede, tentar servir a página offline
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});
