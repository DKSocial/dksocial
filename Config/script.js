// Configurações do Spotify
const clientId = 'ae83ae23c66346119a9e212d19084e0b'; // Substitua pelo seu Client ID do Spotify
const redirectUri = 'http://127.0.0.1:5500/Config/'; // URL de redirecionamento
const scopes = 'user-read-currently-playing user-read-playback-state'; // Escopos necessários

// Intervalo de atualização (em milissegundos)
const updateInterval = 1000; // 1 segundo
let updateIntervalId;

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
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    if (!nowPlayingElement || !albumCoverElement || !progressBar || !progressText) {
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
            const progressPercent = ((progressMs / durationMs) * 100).toFixed(2);

            // Exibe a música atual
            nowPlayingElement.textContent = `Tocando agora: ${songName} - ${artistName}`;

            // Exibe a capa do álbum
            albumCoverElement.src = albumCoverUrl;
            albumCoverElement.style.display = 'block';

            // Exibe o progresso da música
            progressBar.value = progressPercent;
            progressText.textContent = `Progresso: ${progressPercent}%`;
        } else if (response.status === 204) {
            nowPlayingElement.textContent = 'Nenhuma música está tocando no momento.';
            albumCoverElement.style.display = 'none';
            progressBar.value = 0;
            progressText.textContent = '';
        } else {
            console.error('Erro ao obter a música atual:', response.statusText);
            nowPlayingElement.textContent = 'Erro ao obter a música atual.';
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        nowPlayingElement.textContent = 'Erro na conexão com o Spotify.';
    }
}

// Função para iniciar a atualização periódica
function startUpdatingNowPlaying() {
    updateIntervalId = setInterval(getNowPlaying, updateInterval);
}

// Função para parar a atualização periódica
function stopUpdatingNowPlaying() {
    clearInterval(updateIntervalId);
}

// Função para desconectar do Spotify
function disconnectSpotify() {
    localStorage.removeItem('spotifyAccessToken');
    checkSpotifyConnection();
    stopUpdatingNowPlaying(); // Para a atualização periódica
    alert('Desconectado do Spotify com sucesso!');
}

// Inicia a atualização quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    const accessToken = getAccessTokenFromUrl();
    if (accessToken) {
        localStorage.setItem('spotifyAccessToken', accessToken);
        checkSpotifyConnection();
    } else {
        checkSpotifyConnection();
    }

    // Inicia a atualização periódica
    startUpdatingNowPlaying();
});