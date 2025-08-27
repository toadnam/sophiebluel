const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorEl = document.getElementById('login-error');

form.addEventListener('submit', handleSubmit);

function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
}

async function handleSubmit(event) {
    event.preventDefault();
    errorEl.hidden = true;

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        showError('Veuillez remplir les deux champs.');
        return;
    }

    try {
        const response = await fetch('http://localhost:5678/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        });

        if (!response.ok) {
            showError('E-mail ou mot de passe incorrect.');
            return;
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        window.location.href = './index.html';
    } catch (err) {
        showError('Une erreur est survenue. Réessayez.');
        console.error(err);
    }
}


