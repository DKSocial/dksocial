// sujestoes.js

// Variável para armazenar sugestões em cache (para evitar várias consultas)
let cachedSuggestions = null;

/**
 * Busca sugestões de usuários do Firestore (exceto o usuário atual).
 * @returns {Promise<Array>} Array de objetos com os dados dos usuários.
 */
const fetchSuggestions = async () => {
  if (!cachedSuggestions) {
    const suggestions = [];
    const usersSnapshot = await db.collection('users').get();
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      // Exclui o usuário atual (assegure-se de que currentUser esteja definido globalmente)
      if (userData.uid !== currentUser.uid) {
        suggestions.push(userData);
      }
    });
    
    // Exemplo: pega os 3 primeiros usuários (você pode alterar a lógica se desejar randomizar)
    cachedSuggestions = suggestions.slice(0, 3);
  }
  return cachedSuggestions;
};

/**
 * Renderiza um bloco com sugestões de perfis no container de tweets.
 * Este bloco será inserido sempre que a condição (ex.: a cada 10 posts) for atendida.
 */
const renderSuggestions = async () => {
  const suggestions = await fetchSuggestions();

  // Cria o elemento de sugestões
  const suggestionDiv = document.createElement('div');
  suggestionDiv.className = 'suggestions';
  suggestionDiv.innerHTML = `<h3>Sugestões de Perfis</h3>`;

  suggestions.forEach(user => {
    suggestionDiv.innerHTML += `
      <a href="/Perfil/?user=${user.username}" class="suggestion-item">
        ${user.username}
      </a>
    `;
  });

  // Insere o bloco de sugestões no container de tweets
  // Certifique-se de que 'tweetsContainer' esteja disponível globalmente
  tweetsContainer.appendChild(suggestionDiv);
};
