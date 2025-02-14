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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Login com Google
document.getElementById('google-login').addEventListener('click', (e) => {
    e.preventDefault();
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            // Verificar se o email já existe no sistema
            db.collection('users').doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        // Se o usuário já existir, realiza o login
                        alert('Login bem-sucedido com Google!');
                        window.location.href = '/home/'; // Redirecionar para a página desejada
                    } else {
                        // Se o usuário não existir, abre a modal de criação de conta
                        document.getElementById('register-modal').style.display = 'flex';
                        alert('Você precisa criar uma conta antes!');
                    }
                })
                .catch((error) => {
                    alert(error.message);
                });
        })
        .catch((error) => {
            alert(error.message);
        });
});

// Login com GitHub
document.getElementById('github-login').addEventListener('click', (e) => {
    e.preventDefault();
    const provider = new firebase.auth.GithubAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            // Verificar se o email já existe no sistema
            db.collection('users').doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        // Se o usuário já existir, realiza o login
                        alert('Login bem-sucedido com GitHub!');
                        window.location.href = '/home/'; // Redirecionar para a página desejada
                    } else {
                        // Se o usuário não existir, abre a modal de criação de conta
                        document.getElementById('register-modal').style.display = 'flex';
                        alert('Você precisa criar uma conta antes!');
                    }
                })
                .catch((error) => {
                    alert(error.message);
                });
        })
        .catch((error) => {
            alert(error.message);
        });
});

// Registro com e-mail e senha
document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            userCredential.user.sendEmailVerification().then(() => {
                alert('Verificação de e-mail enviada!');
            });
        })
        .catch((error) => {
            alert(error.message);
        });
});

// Login com e-mail e senha
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            if (!userCredential.user.emailVerified) {
                alert('Por favor, verifique seu e-mail antes de fazer login.');
            } else {
                localStorage.setItem('setupConcluido', "true");
                alert('Login bem-sucedido!');
            }
        })
        .catch((error) => {
            alert(error.message);
        });
});

// Verificar estado de autenticação
auth.onAuthStateChanged((user) => {
    if (user) {
        // Verificar se o e-mail foi verificado
        if (user.emailVerified) {
            db.collection('users').doc(user.uid).get()
                .then((doc) => {
                    if (!doc.exists) {
                        // Se o perfil não existe, mostra a modal de perfil
                        document.getElementById('profile-modal').style.display = 'flex';
                    }
                })
                .catch((error) => {
                    alert(error.message);
                });
        } else {
            // Caso o e-mail não tenha sido verificado, aguarda a verificação
            user.sendEmailVerification().then(() => {
                alert('Verificação de e-mail enviada novamente!');
            });
        }
    }
});

// Salvar perfil no Firestore
document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const bio = document.getElementById('bio').value;
    const profilePicture = document.getElementById('profile-picture').value;

    const user = auth.currentUser;
    if (user) {
        db.collection('users').doc(user.uid).set({
            username: username,
            bio: bio,
            verified: false, // Definir como false por padrão
            profilePicture: profilePicture
        }).then(() => {
            alert('Perfil salvo com sucesso!');
            localStorage.setItem('setupConcluido', "true");
            window.location.href = '/home/'; // Redirecionar para a página desejada
            document.getElementById('profile-modal').style.display = 'none';
        }).catch((error) => {
            alert(error.message);
        });
    }
});

// Controle de modais
document.getElementById('tos-link').onclick = () => {
    document.getElementById('tos-modal').style.display = 'flex';
};
document.getElementById('close-tos-modal').onclick = () => {
    document.getElementById('tos-modal').style.display = 'none';
};
document.getElementById('register-link').onclick = () => {
    document.getElementById('register-modal').style.display = 'flex';
};
document.getElementById('close-register-modal').onclick = () => {
    document.getElementById('register-modal').style.display = 'none';
};
document.getElementById('login-link').onclick = () => {
    document.getElementById('login-modal').style.display = 'flex';
};
document.getElementById('close-login-modal').onclick = () => {
    document.getElementById('login-modal').style.display = 'none';
};
document.getElementById('close-profile-modal').onclick = () => {
    document.getElementById('profile-modal').style.display = 'none';
};

window.onclick = (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
