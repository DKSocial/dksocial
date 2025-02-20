// Inicializando o Firebase 8
const firebaseConfig = {
    apiKey: "AIzaSyA_d2rRI7GWGvrcGq4KuiZiVhWAKWAkFjQ",
    authDomain: "dksocialbr.firebaseapp.com",
    projectId: "dksocialbr",
    storageBucket: "dksocialbr.appspot.com",
    messagingSenderId: "920583441447",
    appId: "1:920583441447:web:5a28bc09a21cbeaa679202",
    measurementId: "G-WDP6ME7D1P"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Referências aos elementos da página
const profileName = document.getElementById('profileName');
const profilePhoto = document.getElementById('profilePhoto');
const profileDisplayName = document.getElementById('profileDisplayName');
const profileUsername = document.getElementById('profileUsername');
const followingCount = document.getElementById('followingCount');
const followerCount = document.getElementById('followerCount');
const profileActionButton = document.getElementById('profileActionButton');
const tabContent = document.getElementById('tabContent');
const editProfileModal = document.getElementById('editProfileModal');
const closeModal = document.querySelector('.close');
const editProfileForm = document.getElementById('editProfileForm');

// Variáveis globais
let currentProfileUserId = null; // Armazena o ID do perfil carregado
let currentUser = null; // Armazena o usuário logado

// Função para carregar os dados do perfil do Firestore
function loadProfileData(userData, userId) {
    currentProfileUserId = userId; // Armazena o ID do perfil carregado
    profileName.textContent = userData.username || "Nome não definido";
    profilePhoto.src = userData.profilePicture || "https://via.placeholder.com/100";
    profileDisplayName.textContent = userData.username || "Nome não definido";
    profileUsername.textContent = `@${userData.username}` || "@username";

    // Atualiza o título da página para "DK - @username"
    document.title = `DK - @${userData.username}`;

    // Exibe o ícone de verificação se o usuário for verificado
    if (userData.verified) {
        profileDisplayName.innerHTML += `
        <svg class="verified-icon" viewBox="0 0 24 24">
          <!-- Círculo pontilhado -->
          <circle cx="12" cy="12" r="10" fill="none" stroke="#9b59b6" stroke-width="2" stroke-dasharray="4,4" />
          <!-- Ícone de verificação -->
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="#9b59b6"/>
        </svg>
      ` ;
    }

    // Atualiza a foto de capa
    document.querySelector('.cover-photo').style.backgroundImage = `url(${userData.coverPhotoURL || "https://via.placeholder.com/600x200"})`;

    // Atualiza as estatísticas (se existirem)
    followingCount.textContent = userData.followingCount || 0; // Quantidade de pessoas que o usuário segue
    followerCount.textContent = userData.followersCount || 0; // Quantidade de seguidores

    // Verifica se o perfil é do usuário logado
    if (currentUser && currentUser.uid === userId) {
        profileActionButton.textContent = "Editar perfil";
        profileActionButton.onclick = openEditProfileModal;
    } else {
        // Verifica se o usuário logado já segue o perfil carregado
        checkIfUserFollows(userId).then((isFollowing) => {
            updateFollowButton(isFollowing);
        });
    }
}

// Função para buscar os tweets do usuário
function loadUserTweets(userId) {
    db.collection('tweets')
        .where('userId', '==', userId) // Filtra os tweets pelo autor
        .orderBy('timestamp', 'desc') // Ordena por data (do mais recente para o mais antigo)
        .get()
        .then((querySnapshot) => {
            tabContent.innerHTML = ""; // Limpa o conteúdo anterior
            querySnapshot.forEach((doc) => {
                const tweet = doc.data();
                displayTweet(tweet); // Exibe cada tweet
            });
        })
        .catch((error) => {
            console.error("Erro ao buscar tweets:", error);
        });
}

// Função para exibir um tweet na página
function displayTweet(tweet) {
    const tweetElement = document.createElement('div');
    tweetElement.classList.add('tweet');
    tweetElement.innerHTML = `
        <p>${tweet.content}</p>
        <small>${new Date(tweet.timestamp?.toDate()).toLocaleString()}</small>
    `;
    tabContent.appendChild(tweetElement);
}

// Função para deixar de seguir um usuário
function unfollowUser(userId) {
    db.collection('users').doc(userId).update({
        followers: firebase.firestore.FieldValue.arrayRemove(currentUser.uid), // Remove apenas o usuário logado
        followersCount: firebase.firestore.FieldValue.increment(-1) // Decrementa o contador de seguidores
    }).then(() => {
        // Atualiza o contador de seguidores na interface
        followerCount.textContent = parseInt(followerCount.textContent) - 1;

        // Atualiza o contador de "seguindo" do usuário logado
        db.collection('users').doc(currentUser.uid).update({
            followingCount: firebase.firestore.FieldValue.increment(-1)
        }).then(() => {
            followingCount.textContent = parseInt(followingCount.textContent) - 1;

            // Atualiza o botão para "Seguir"
            updateFollowButton(false);
        });
    }).catch((error) => {
        console.error("Erro ao deixar de seguir usuário:", error);
    });
}

// Função para seguir um usuário
function followUser(userId) {
    db.collection('users').doc(userId).update({
        followers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid), // Adiciona apenas o usuário logado
        followersCount: firebase.firestore.FieldValue.increment(1) // Incrementa o contador de seguidores
    }).then(() => {
        // Atualiza o contador de seguidores na interface
        followerCount.textContent = parseInt(followerCount.textContent) + 1;

        // Atualiza o contador de "seguindo" do usuário logado
        db.collection('users').doc(currentUser.uid).update({
            followingCount: firebase.firestore.FieldValue.increment(1)
        }).then(() => {
            followingCount.textContent = parseInt(followingCount.textContent) + 1;

            // Atualiza o botão para "Deixar de seguir"
            updateFollowButton(true);
        });
    }).catch((error) => {
        console.error("Erro ao seguir usuário:", error);
    });
}

// Função para atualizar o botão de seguir/deixar de seguir
function updateFollowButton(isFollowing) {
    if (isFollowing) {
        profileActionButton.textContent = "Deixar de seguir";
        profileActionButton.onclick = () => unfollowUser(currentProfileUserId);
    } else {
        profileActionButton.textContent = "Seguir";
        profileActionButton.onclick = () => followUser(currentProfileUserId);
    }
}

// Função para verificar se o usuário logado segue o perfil carregado
async function checkIfUserFollows(userId) {
    const userDoc = await db.collection('users').doc(userId).get();
    const followers = userDoc.data().followers || [];
    return followers.includes(currentUser.uid);
}

// Função para buscar o perfil do usuário pelo username
function loadProfileByUsername(username) {
    db.collection('users')
        .where('username', '==', username)
        .get()
        .then((querySnapshot) => {
            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                loadProfileData(userData, userDoc.id); // Passa o ID do documento
                loadUserTweets(userDoc.id); // Carrega os tweets do usuário
            } else {
                console.log("Usuário não encontrado!");
                // Redirecionar para a página de erro ou exibir uma mensagem
            }
        })
        .catch((error) => {
            console.error("Erro ao buscar usuário:", error);
        });
}

// Função para alternar entre as abas
function switchTab(tab) {
    const tabs = document.querySelectorAll('.nav-tabs div');
    tabs.forEach(t => t.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');

    if (tab === 'posts') {
        // Carrega os tweets do usuário ao alternar para a aba "Publicações"
        loadUserTweets(currentProfileUserId);
    } else if (tab === 'likes') {
        // Simulação de conteúdo para a aba "Curtidas"
        tabContent.innerHTML = `<div class="tweet"><p>Publicação curtida 1</p><small>Há 3 horas</small></div>
                                <div class="tweet"><p>Publicação curtida 2</p><small>Há 2 dias</small></div>`;
    }
}

// Função para abrir o modal de edição de perfil
function openEditProfileModal() {
    editProfileModal.style.display = 'block';
}

// Função para fechar o modal de edição de perfil
function closeEditProfileModal() {
    editProfileModal.style.display = 'none';
}

// Event listeners
closeModal.addEventListener('click', closeEditProfileModal);
window.addEventListener('click', (event) => {
    if (event.target === editProfileModal) {
        closeEditProfileModal();
    }
});

// Formulário de edição de perfil
editProfileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newUsername = document.getElementById('username').value;
    const newBio = document.getElementById('bio').value;
    const newPhotoURL = document.getElementById('photoURL').value;
    const newCoverPhotoURL = document.getElementById('coverPhotoURL').value;

    // Atualiza os dados do perfil no Firestore
    if (currentUser) {
        db.collection('users').doc(currentUser.uid).update({
            username: newUsername,
            bio: newBio,
            profilePicture: newPhotoURL,
            coverPhotoURL: newCoverPhotoURL
        }).then(() => {
            console.log("Perfil atualizado com sucesso!");
            loadProfileData(userData, currentUser.uid); // Recarrega os dados do perfil
            closeEditProfileModal();
        }).catch((error) => {
            console.error("Erro ao atualizar perfil:", error);
        });
    }
});

// Verifica se há um parâmetro 'user' na URL
const urlParams = new URLSearchParams(window.location.search);
const usernameParam = urlParams.get('user');

// Verifica se o usuário está logado e carrega os dados do perfil
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user; // Armazena o usuário logado
        if (usernameParam) {
            // Se houver um parâmetro 'user' na URL, carrega o perfil desse usuário
            loadProfileByUsername(usernameParam);
        } else {
            // Se não houver parâmetro, carrega o perfil do usuário logado
            db.collection('users').doc(user.uid).get().then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    loadProfileData(userData, doc.id);
                    loadUserTweets(doc.id); // Carrega os tweets do usuário logado
                } else {
                    console.log("Documento do usuário não encontrado!");
                }
            }).catch((error) => {
                console.error("Erro ao buscar dados do usuário:", error);
            });
        }
    } else {
        // Usuário não logado, redirecionar para a página de login
        window.location.href = "/Login/"; // Substitua pelo seu caminho de login
    }
    switchTab('posts'); // Carrega a aba de publicações por padrão
});

// Verifique se o usuário está logado
auth.onAuthStateChanged((user) => {
    if (user) {
        // Usuário logado, verifique se está banido
        const uid = user.uid;
        db.collection('users').doc(uid).get()
            .then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    if (userData.banned === true) {
                        // Usuário está banido, redirecione para outra página
                        window.location.href = '/banned.html';
                    } else {
                        // Usuário não está banido, continue normalmente
                        console.log('Usuário não está banido.');
                    }
                } else {
                    console.log('Documento do usuário não encontrado.');
                }
            })
            .catch((error) => {
                console.error('Erro ao buscar dados do usuário:', error);
            });
    } else {
        // Usuário não está logado, redirecione para a página de login
        window.location.href = '/Login/';
    }
});

// Adiciona event listeners aos contadores
followingCount.addEventListener('click', () => showUserList('following'));
followerCount.addEventListener('click', () => showUserList('followers'));

// Função para exibir a lista de seguidores ou de pessoas que o usuário segue
async function showUserList(type) {
    const userId = currentProfileUserId; // ID do perfil carregado

    // Busca os dados do usuário no Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Define a lista de usuários a ser exibida
    let userList = [];
    if (type === 'following') {
        userList = userData.following || [];
    } else if (type === 'followers') {
        userList = userData.followers || [];
    }

    // Exibe a lista de usuários
    displayUserList(userList, type);
}

// Função para exibir a lista de seguidores ou de pessoas que o usuário segue
async function showUserList(type) {
    const userId = currentProfileUserId; // ID do perfil carregado

    // Busca os dados do usuário no Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Define a lista de usuários a ser exibida
    let userList = [];
    if (type === 'following') {
        userList = userData.following || [];
    } else if (type === 'followers') {
        userList = userData.followers || [];
    }

    // Exibe a lista de usuários
    displayUserList(userList, type);
}

// Função para exibir a lista de usuários
async function displayUserList(userList, type) {
    const modal = document.createElement('div');
    modal.classList.add('user-list-modal');

    const modalContent = document.createElement('div');
    modalContent.classList.add('user-list-modal-content');

    const closeButton = document.createElement('span');
    closeButton.classList.add('close');
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => modal.remove();

    const title = document.createElement('h2');
    title.textContent = type === 'following' ? 'Seguindo' : 'Seguidores';

    const list = document.createElement('ul');

    // Para cada ID na lista, buscar o nome e o username do usuário
    for (const userId of userList) {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            const username = userData.username;
            const displayName = userData.displayName || username;

            // Criar o link para o perfil do usuário
            const listItem = document.createElement('li');
            const userLink = document.createElement('a');
            userLink.href = `/Perfil/?user=${username}`; // Link para o perfil
            userLink.textContent = displayName; // Exibe o nome do usuário
            userLink.style.textDecoration = 'none'; // Remove sublinhado do link
            userLink.style.color = '#000'; // Cor do texto

            listItem.appendChild(userLink);
            list.appendChild(listItem);
        }
    }

    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(list);
    modal.appendChild(modalContent);

    document.body.appendChild(modal);
}

// Configurações do Spotify
const clientId = 'ae83ae23c66346119a9e212d19084e0b'; // Substitua pelo seu Client ID do Spotify
const redirectUri = 'http://127.0.0.1:5500/Perfil/'; // URL de redirecionamento
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
        getNowPlaying(); // Obter a música atual
    } else {
        alert('Conecte-se ao Spotify para ver a música atual.');
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
    setInterval(getNowPlaying, 1000); // Atualiza a cada 1 segundo
});