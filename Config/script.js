// Configurações do Spotify
const clientId = 'ae83ae23c66346119a9e212d19084e0b'; // Substitua pelo seu Client ID do Spotify
const redirectUri = 'https://dksocial.space/Config/'; // URL de redirecionamento
const scopes = 'user-read-currently-playing user-read-playback-state'; // Escopos necessários

// Função para conectar com o Spotify
function connectSpotify() {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=token&show_dialog=true`;
    window.location.href = authUrl;
}

// Função para obter o token de acesso da URL
function getAccessTokenFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('access_token');
}

// Função para verificar a conexão com o Spotify
function checkSpotifyConnection() {
    const accessToken = localStorage.getItem('spotifyAccessToken');
    if (accessToken) {
        document.getElementById('spotify-status').textContent = 'Status: Conectado';
        getNowPlaying(); // Obter a música atual
    } else {
        document.getElementById('spotify-status').textContent = 'Status: Não conectado';
    }
}

// Função para obter a música atualmente em reprodução
async function getNowPlaying() {
    const accessToken = localStorage.getItem('spotifyAccessToken');
    const nowPlayingElement = document.getElementById('now-playing');
    const albumCoverElement = document.getElementById('album-cover');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const currentTimeElement = document.getElementById('current-time');
    const totalTimeElement = document.getElementById('total-time');

    if (!nowPlayingElement || !albumCoverElement || !progressContainer || !progressBar || !currentTimeElement || !totalTimeElement) {
        console.error('Elementos do DOM não encontrados.');
        return;
    }

    if (!accessToken) {
        console.error('Token de acesso não encontrado');
        nowPlayingElement.textContent = 'Conecte-se ao Spotify para ver a música atual.';
        return;
    }

    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.status === 200) {
            const data = await response.json();
            const songName = data.item.name;
            const artistName = data.item.artists[0].name;
            const albumCoverUrl = data.item.album.images[0].url;
            const progressMs = data.progress_ms;
            const durationMs = data.item.duration_ms;

            // Exibe a música atual
            nowPlayingElement.textContent = `Tocando agora: ${songName} - ${artistName}`;

            // Exibe a capa do álbum
            albumCoverElement.src = albumCoverUrl;
            albumCoverElement.style.display = 'block';

            // Exibe o mini container de progresso
            progressContainer.style.display = 'block';

            // Atualiza a barra de progresso
            const progressPercent = ((progressMs / durationMs) * 100).toFixed(2);
            progressBar.style.width = `${progressPercent}%`;

            // Converte milissegundos para minutos:segundos
            const formatTime = (ms) => {
                const minutes = Math.floor(ms / 60000);
                const seconds = ((ms % 60000) / 1000).toFixed(0);
                return `${minutes}:${seconds.padStart(2, '0')}`;
            };

            // Atualiza o tempo atual e o tempo total
            currentTimeElement.textContent = formatTime(progressMs);
            totalTimeElement.textContent = formatTime(durationMs);
        } else if (response.status === 204) {
            nowPlayingElement.textContent = 'Nenhuma música está tocando no momento.';
            albumCoverElement.style.display = 'none';
            progressContainer.style.display = 'none';
        } else {
            console.error('Erro ao obter a música atual:', response.statusText);
            nowPlayingElement.textContent = 'Erro ao obter a música atual.';
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        nowPlayingElement.textContent = 'Erro na conexão com o Spotify.';
    }
}

// Função para desconectar do Spotify
function disconnectSpotify() {
    localStorage.removeItem('spotifyAccessToken');
    checkSpotifyConnection();
    alert('Desconectado do Spotify com sucesso!');
}

// Função para alternar a exibição das seções
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    section.classList.toggle('open');
}

// Função para salvar configurações de notificação
function saveNotificationSettings() {
    const notifications = document.getElementById('notifications').value;
    localStorage.setItem('notifications', notifications);
    alert('Configurações de notificação salvas com sucesso!');
}

// Função para salvar som de notificação
function saveNotificationSound() {
    const notificationSound = document.getElementById('notification-sound').value;
    localStorage.setItem('notificationSound', notificationSound);
    alert('Som de notificação salvo com sucesso!');
}

// Função para salvar idioma
function saveLanguage() {
    const selectedLanguage = document.getElementById('language-select').value;
    localStorage.setItem('selectedLanguage', selectedLanguage);
    alert('Idioma salvo com sucesso!');
    window.location.reload(); // Recarrega a página para aplicar as traduções
}

// Carrega o idioma salvo ao abrir a página
const languageSelect = document.getElementById('language-select');
languageSelect.value = localStorage.getItem('selectedLanguage') || 'pt-BR';

// Firebase Logout
const logoutButton = document.getElementById('logout-button');
logoutButton.addEventListener('click', () => {
    firebase.auth().signOut().then(() => {
        alert('Logout realizado com sucesso!');
        window.location.href = '/Login/'; // Redireciona para a página de login
    }).catch((error) => {
        console.error('Erro ao fazer logout:', error);
    });
});

// Verifica o status das conexões ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    const accessToken = getAccessTokenFromUrl();
    if (accessToken) {
        localStorage.setItem('spotifyAccessToken', accessToken);
        checkSpotifyConnection();
    } else {
        checkSpotifyConnection();
    }

    // Inicia a atualização periódica
    setInterval(getNowPlaying, 1000); // Atualiza a cada 1 segundo
});
