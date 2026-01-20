document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value.trim();
  const erroDiv = document.getElementById('erro');

  erroDiv.innerText = '';

  try {
    const res = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, senha })
    });

    const data = await res.json();

    console.log('Resposta do backend:', data);

    if (!res.ok) {
      erroDiv.innerText = data.message || data.erro || 'Erro ao fazer login';
      return;
    }

    if (!data.usuario) {
      erroDiv.innerText = 'Resposta inválida do servidor.';
      return;
    }

    // Salva o usuário no navegador
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    localStorage.setItem('token', data.token);

    // Redireciona conforme o tipo
   if (data.usuario.tipo === 'admin') {
  window.location.href = 'admin.html';
} else if (data.usuario.tipo === 'produtor') {
  window.location.href = 'produtor.html';
} else {
  window.location.href = 'marketplace.html';
}

  } catch (err) {
    console.error('Erro no login:', err);
    erroDiv.innerText = 'Erro de conexão com o servidor';
  }
});

