import request from 'supertest';
import app from '../../src/app.js';

async function login(email, senha) {
  const resposta = await request(app).post('/api/auth/login').send({ email, senha });
  if (resposta.status !== 200) {
    throw new Error(`Falha no login de "${email}": status ${resposta.status} - ${JSON.stringify(resposta.body)}`);
  }
  return resposta.body;
}

// Helper: login do administrador (credenciais vindas do .env via dotenv).
export async function loginAdmin() {
  const { ADMIN_EMAIL, ADMIN_SENHA } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_SENHA) {
    throw new Error('Defina ADMIN_EMAIL e ADMIN_SENHA no arquivo .env (veja .env.example).');
  }
  return login(ADMIN_EMAIL, ADMIN_SENHA);
}

// Helper: login de um aluno com e-mail e senha informados.
export async function loginAluno(email, senha) {
  return login(email, senha);
}
