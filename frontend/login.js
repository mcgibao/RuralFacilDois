async function login() {
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  const erro = document.getElementById('erro');

  erro.textContent = '';

  const res = await fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem('usuario', JSON.stringify(data));
    window.location.href = 'index.html';
  } else {
    erro.textContent = data.error || 'Erro ao fazer login';
  }
}
