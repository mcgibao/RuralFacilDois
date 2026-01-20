document.getElementById('cadastroForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const nome = document.getElementById('nome').value;
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  const tipo = document.getElementById('tipo').value;

  console.log('Enviando cadastro:', nome, email, senha, tipo);

  try {
    const res = await fetch('http://localhost:3000/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, tipo })
    });

    const data = await res.json();

    if (res.ok) {
      alert('Cadastro realizado!');
      window.location.href = 'login.html';
    } else {
      alert(data.message || 'Erro no cadastro');
    }
  } catch (err) {
    console.error(err);
    alert('Erro de conexão');
  }
});
