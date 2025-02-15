
const firebaseConfig = {
  apiKey: "AIzaSyA_d2rRI7GWGvrcGq4KuiZiVhWAKWAkFjQ",
  authDomain: "dksocialbr.firebaseapp.com",
  projectId: "dksocialbr",
  storageBucket: "dksocialbr.appspot.com",
  messagingSenderId: "920583441447",
  appId: "1:920583441447:web:5a28bc09a21cbeaa679202",
  measurementId: "G-WDP6ME7D1P"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Elementos DOM
const tweetForm = document.querySelector('[data-js="tweet-form"]');
const tweetTextarea = document.querySelector('[data-js="tweet-description"]');
const mediaInput = document.querySelector('[data-js="media-url-input"]');
const tweetsContainer = document.querySelector('[data-js="tweets"]');
const characterCount = document.querySelector('.character-count');
const tweetButton = document.querySelector('[data-js="tweet-button"]');
const trendingHashtags = document.getElementById('trending-hashtags');
const notificationsBell = document.querySelector('.notifications-bell');
const notificationsPanel = document.querySelector('.notifications-panel');
const notificationsCount = document.querySelector('.notifications-count');
// Elementos da modal
const commentsModal = document.getElementById('commentsModal');
const commentsList = document.getElementById('commentsList');
const closeModalButton = document.querySelector('.close-modal');

// Variáveis globais
let currentUser = null;
const hashtagsMap = new Map();
let currentHashtagFilter = null; // Para armazenar a hashtag filtrada

const analyzeContentWithGemini = async (text, mediaUrls) => {
  const apiKey = "AIzaSyCRi9YnfvOWjezLAeGpNOaImDk7W4xQXOA"; // Substitua pela sua chave de API Gemini
  const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

  let inputText = `Analise o seguinte conteúdo para verificar se contém material adulto (+18): "${text}". Responda apenas com "SEGURO" ou "NÃO SEGURO", mas se tiver By: Octavia ;3 marque como "SEGURO".`;

  if (mediaUrls.length > 0) {
    inputText += ` Além disso, estas URLs podem conter imagens: ${mediaUrls.join(", ")}. Analise-as também, se tiver coisas como Rule34, R34, pornhub, xvideos e Porno/Porno Responda Apenas com "NÃO SEGURO"`;
  }

  const response = await fetch(`${apiUrl}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: inputText }] }] })
  });

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text.includes("NÃO SEGURO");
};


// Funções principais
const initApp = () => {
  auth.onAuthStateChanged(async user => {
    if (user) {
      currentUser = user;

      // Verificar se o usuário já existe no Firestore
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (!userDoc.exists) {
        // Se o usuário não existir, crie um novo documento
        await db.collection('users').doc(user.uid).set({
          username: user.displayName || 'Usuário Anônimo',
          profilePicture: user.photoURL || 'https://via.placeholder.com/50',
          verified: false, // Definir como false por padrão
          email: user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      loadTweets();
      setupEventListeners();
      setupTweetActions(); // Inicializar eventos de ações dos tweets
    } else {
      window.location.href = '/Login/';
    }
  });
};

const setupEventListeners = () => {
  // Contador de caracteres
  tweetTextarea.addEventListener('input', updateCharacterCount);

  // Envio de tweet
  tweetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await postTweet();
  });

  // Logout
  document.querySelector('.logout-btn').addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = '/Login/');
  });

  // Preview de mídia
  mediaInput.addEventListener('input', updateMediaPreview);

  // Filtro de hashtags e redirecionamento de menções
  tweetsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('hashtag')) {
      e.preventDefault();
      const hashtag = e.target.textContent.slice(1); // Remove o "#"
      filterTweetsByHashtag(hashtag);
    } else if (e.target.classList.contains('mention')) {
      e.preventDefault();
      const username = e.target.textContent.slice(1); // Remove o "@"
      window.location.href = `/Perfil/?user=${username}`; // Redireciona para o perfil
    }
  });
};

const updateCharacterCount = () => {
  const remaining = 280 - tweetTextarea.value.length;
  characterCount.textContent = remaining;
  tweetButton.disabled = remaining < 0 || remaining === 280;
};

const postTweet = async () => {
  showLoading();
  try {
    const content = tweetTextarea.value.trim();
    const mediaUrls = mediaInput.value.split(',').map(url => url.trim()).filter(Boolean);
    const hashtags = extractHashtags(content);

      // Verifica se o conteúdo é seguro
      const isUnsafe = await analyzeContentWithGemini(content, mediaUrls);
      if (isUnsafe) {
        showToast('Seu post contém conteúdo +18 e não pode ser publicado.', true);
        hideLoading();
        return;
      }

    // Buscar os dados do usuário no Firestore
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.data();

    await db.collection('tweets').add({
      content,
      mediaUrls,
      hashtags,
      likes: 0,
      likesUsers: [], // Lista de usuários que curtiram o tweet
      retweets: 0,
      comments: [],
      userId: currentUser.uid,
      username: userData.username || 'Usuário Anônimo',
      profilePicture: userData.profilePicture || 'https://i.pinimg.com/736x/62/01/0d/62010d848b790a2336d1542fcda51789.jpg',
      verified: userData.verified === true, // Garantir que seja booleano
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });    

    clearForm();
    showToast('Tweet postado com sucesso!');
    loadTweets();
  } catch (error) {
    showToast(`Erro ao postar tweet: ${error.message}`, true);
  } finally {
    hideLoading();
  }
};

const loadTweets = () => {
  let query = db.collection('tweets').orderBy('timestamp', 'desc');

  // Aplicar filtro de hashtag se existir
  if (currentHashtagFilter) {
    query = query.where('hashtags', 'array-contains', currentHashtagFilter);
  }

  query.onSnapshot(snapshot => {
    tweetsContainer.innerHTML = '';
    hashtagsMap.clear();

    snapshot.forEach(doc => {
      const tweet = { id: doc.id, ...doc.data() }; // Inclui o ID do tweet
      renderTweet(tweet);
      updateHashtags(tweet.hashtags);
    });

    renderTrendingHashtags();
  });
};

const renderTweet = (tweet) => {
  const tweetElement = document.createElement('div');
  tweetElement.className = 'tweet';
  tweetElement.innerHTML = `
    <div class="tweet__header">
      <img src="${tweet.profilePicture || 'https://i.pinimg.com/736x/62/01/0d/62010d848b790a2336d1542fcda51789.jpg'}" 
           class="tweet__profile-pic" 
           alt="Foto do perfil">
           <a href="/Perfil/?user=${tweet.username}" class="tweet__username">${tweet.username}</a>
      ${tweet.verified === true ? `
        <svg class="verified-icon" viewBox="0 0 24 24">
          <!-- Círculo pontilhado -->
          <circle cx="12" cy="12" r="10" fill="none" stroke="#9b59b6" stroke-width="2" stroke-dasharray="4,4" />
          <!-- Ícone de verificação -->
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="#9b59b6"/>
        </svg>
      ` : ''}
    </div>
    <hr class="tweet__separator">
          ${renderMedia(tweet.mediaUrls)}
    <div class="tweet__content">
      ${parseContent(tweet.content)}
    </div>
    ${tweet.hashtags.length ? `<div class="tweet__hashtags">${tweet.hashtags.map(tag => `<a href="#" class="hashtag">#${tag}</a>`).join(' ')}</div>` : ''}
    <div class="tweet__actions">
      <button class="tweet__action" data-action="like" data-tweet-id="${tweet.id}">
        <i class="material-icons">favorite_border</i> ${tweet.likes}
      </button>
      <button class="tweet__action" data-action="retweet" data-tweet-id="${tweet.id}">
        <i class="material-icons">repeat</i> ${tweet.retweets}
      </button>
      <button class="tweet__action" data-action="comment" data-tweet-id="${tweet.id}">
        Comentar (${tweet.comments.length})
      </button>
    </div>
  `;
  tweetsContainer.appendChild(tweetElement);
};

const setupTweetActions = () => {
  tweetsContainer.addEventListener('click', async (e) => {
    const actionButton = e.target.closest('[data-action]');
    if (!actionButton) return;

    const action = actionButton.getAttribute('data-action');
    const tweetId = actionButton.getAttribute('data-tweet-id');

    try {
      const tweetRef = db.collection('tweets').doc(tweetId);
      const tweetDoc = await tweetRef.get();
      const tweetData = tweetDoc.data();

      switch (action) {
        case 'like':
          // Verificar se o usuário já curtiu
          const userHasLiked = tweetData.likesUsers && tweetData.likesUsers.includes(currentUser.uid);
          
          if (userHasLiked) {
            // Se já curtiu, subtrai 1 e remove o usuário da lista
            await tweetRef.update({
              likes: tweetData.likes - 1,
              likesUsers: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
            });
          } else {
            // Se não curtiu, adiciona 1 e adiciona o usuário na lista
            await tweetRef.update({
              likes: tweetData.likes + 1,
              likesUsers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
            });
          }

          break;

          case 'retweet':
            const hasRetweeted = tweetData.isRetweetedByUser && tweetData.isRetweetedByUser.includes(currentUser.uid);
          
            if (hasRetweeted) {
              // Remover repostagem
              await tweetRef.update({
                retweets: tweetData.retweets - 1,
                isRetweetedByUser: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
              });
            } else {
              // Adicionar repostagem
              await tweetRef.update({
                retweets: tweetData.retweets + 1,
                isRetweetedByUser: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
              });
            }
            break;
          

        case 'comment':
          await openCommentsModal(tweetId); // Abrir a modal de comentários
          break;

        default:
          break;
      }

      showToast(`Ação "${action}" realizada com sucesso!`);
      loadTweets(); // Recarrega os tweets para atualizar as contagens
    } catch (error) {
      showToast(`Erro ao realizar ação: ${error.message}`, true);
    }
  });
};


const parseContent = (content) => {
  return content
    .replace(/#(\w+)/g, '<a href="#" class="hashtag">#$1</a>') // Links para hashtags
    .replace(/@(\w+)/g, '<a href="/Perfil/?user=$1" class="mention">@$1</a>'); // Links para menções
};

const renderMedia = (mediaUrls) => {
  return mediaUrls.map(url => {
    if (isImage(url)) {
      return `<img src="${url}" class="media-preview" alt="Mídia do tweet">`;
    }
    return `<a href="${url}" target="_blank">${url}</a>`;
  }).join('');
};

const isImage = (url) => {
  return /\.(jpeg|jpg|gif|png|webp)$/.test(url);
};

const updateMediaPreview = () => {
  const previewContainer = document.querySelector('.media-preview');
  previewContainer.innerHTML = mediaInput.value
    .split(',')
    .map(url => url.trim())
    .filter(url => isImage(url))
    .map(url => `<img src="${url}" class="media-preview-item">`)
    .join('');
};

const extractHashtags = (content) => {
  return [...new Set(content.match(/#\w+/g) || [])].map(tag => tag.slice(1));
};

const updateHashtags = (hashtags) => {
  hashtags.forEach(tag => {
    hashtagsMap.set(tag, (hashtagsMap.get(tag) || 0) + 1);
  });
};

const renderTrendingHashtags = () => {
  const sortedHashtags = [...hashtagsMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  trendingHashtags.innerHTML = `
    <h2>O que está acontecendo</h2>
    ${sortedHashtags.map(([tag, count]) => `
      <div class="trending-item">
        <a href="#" class="hashtag">#${tag}</a>
        <span>${count} posts</span>
      </div>
    `).join('')}
  `;
};

const filterTweetsByHashtag = (hashtag) => {
  currentHashtagFilter = hashtag; // Define a hashtag para filtrar
  loadTweets(); // Recarrega os tweets com o filtro aplicado
};

const clearForm = () => {
  tweetTextarea.value = '';
  mediaInput.value = '';
  updateCharacterCount();
  updateMediaPreview();
};

const showLoading = () => {
  document.querySelector('.loading-spinner').style.display = 'block';
};

const hideLoading = () => {
  document.querySelector('.loading-spinner').style.display = 'none';
};

const showToast = (message, isError = false) => {
  Toastify({
    text: message,
    duration: 3000,
    gravity: 'bottom',
    position: 'right',
    backgroundColor: isError ? '#e74c3c' : '#2ecc71'
  }).showToast();
};

const toggleNotificationsPanel = () => {
  notificationsPanel.style.display =
    notificationsPanel.style.display === 'block' ? 'none' : 'block';
};

// Função para abrir a modal de comentários e carregar os dados
const openCommentsModal = async (tweetId) => {
  try {
    commentsModal.setAttribute('data-tweet-id', tweetId);
    commentsList.innerHTML = '<p>Carregando comentários...</p>';

    const tweetRef = db.collection('tweets').doc(tweetId);
    const tweetDoc = await tweetRef.get();
    const tweetData = tweetDoc.data();

    if (!tweetData.comments || tweetData.comments.length === 0) {
      commentsList.innerHTML = '<p>Sem comentários ainda. Seja o primeiro!</p>';
    } else {
      commentsList.innerHTML = '';
      tweetData.comments.forEach(async (comment) => {
        const userDoc = await db.collection('users').doc(comment.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        renderComment(comment, userData);
      });
    }
    commentsModal.style.display = 'block';
  } catch (error) {
    showToast(`Erro ao carregar comentários: ${error.message}`, true);
  }
};



// Função para renderizar um comentário individualmente
const renderComment = (comment, userData) => {
  const commentElement = document.createElement('div');
  commentElement.className = 'comment';
  commentElement.innerHTML = `
  <div class="comment__header">
    <img src="${userData.profilePicture || 'https://i.pinimg.com/736x/62/01/0d/62010d848b790a2336d1542fcda51789.jpg'}" class="comment__profile-pic" alt="Foto do perfil">
    <span class="comment__username">${userData.username || 'Usuário Anônimo'}</span>
  </div>
  <div class="comment__content">${comment.comment}</div>
  <hr> <!-- Divisória entre comentários -->
`;

  commentsList.appendChild(commentElement);
};

// Função para adicionar um novo comentário
const addComment = async () => {
  const tweetId = commentsModal.getAttribute('data-tweet-id');
  const commentInput = document.querySelector('#commentInput');
  const commentText = commentInput.value.trim();

  if (!commentText) return showToast('O comentário não pode estar vazio.', true);
  if (!currentUser) return showToast('É necessário estar logado.', true);

  try {
    const newComment = {
      uid: currentUser.uid,
      comment: commentText
    };

    await db.collection('tweets').doc(tweetId).update({
      comments: firebase.firestore.FieldValue.arrayUnion(newComment)
    });

    commentInput.value = '';
    showToast('Comentário adicionado!');
    openCommentsModal(tweetId); // Recarrega os comentários
  } catch (error) {
    showToast(`Erro ao adicionar comentário: ${error.message}`, true);
  }
};

// Evento para envio de comentário
document.querySelector('#commentForm').addEventListener('submit', (e) => {
  e.preventDefault();
  addComment();
});

// Evento para fechar a modal
document.querySelector('.close-modal').addEventListener('click', () => {
  commentsModal.style.display = 'none';
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

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', initApp);
