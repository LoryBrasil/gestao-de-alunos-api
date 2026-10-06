import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';
import { loginAdmin, loginAluno } from './helpers/auth.helper.js';
import casos from './data/fluxo-aluno.json' with { type: 'json' };

// Sufixo único por execução: evita conflito (409) com dados de execuções anteriores, já que o banco persiste.
const sufixo = Date.now();
const unico = (aluno) => ({
  ...aluno,
  email: aluno.email.replace('@', `+${sufixo}@`),
  matricula: `${aluno.matricula}${sufixo}`,
});

describe('Fluxo completo: admin cadastra aluno, aluno loga e registra trabalho (Data-Driven)', () => {
  let adminToken;
  const alunosCriados = [];

  before(async () => {
    ({ token: adminToken } = await loginAdmin());
  });

  after(async () => {
    // Limpeza: remove os alunos criados pelos testes.
    for (const id of alunosCriados) {
      await request(app).delete(`/api/admin/alunos/${id}`).set('Authorization', `Bearer ${adminToken}`);
    }
  });

  casos.forEach((caso) => {
    describe(caso.cenario, () => {
      const aluno = unico(caso.aluno);
      let alunoId;
      let alunoToken;

      it('admin deve logar e receber um token com papel admin', async () => {
        const { token, user } = await loginAdmin();
        expect(token).to.be.a('string').and.not.empty;
        expect(user.role).to.equal('admin');
      });

      it('admin deve cadastrar o aluno (201) sem expor a senha', async () => {
        const resposta = await request(app)
          .post('/api/admin/alunos')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(aluno);

        expect(resposta.status).to.equal(201);
        expect(resposta.body).to.include({ nome: aluno.nome, email: aluno.email, matricula: aluno.matricula });
        expect(resposta.body).to.have.property('id');
        expect(resposta.body).to.not.have.property('senha');
        alunoId = resposta.body.id;
        alunosCriados.push(alunoId);
      });

      it('admin deve matricular o aluno na disciplina (pré-requisito para entregar trabalho)', async () => {
        const resposta = await request(app)
          .post(`/api/admin/disciplinas/${process.env.DISCIPLINA_ID}/matriculas`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ alunoId });

        expect(resposta.status).to.be.oneOf([200, 201]);
      });

      it('aluno deve logar com as credenciais cadastradas e receber um token', async () => {
        const { token, user } = await loginAluno(aluno.email, aluno.senha);
        expect(token).to.be.a('string').and.not.empty;
        expect(user.role).to.equal('aluno');
        expect(user.id).to.equal(alunoId);
        alunoToken = token;
      });

      it('aluno deve registrar a entrega de um trabalho (201)', async () => {
        const resposta = await request(app)
          .post(`/api/alunos/${alunoId}/trabalhos`)
          .set('Authorization', `Bearer ${alunoToken}`)
          .send({ disciplinaId: process.env.DISCIPLINA_ID, ...caso.trabalho });

        expect(resposta.status).to.equal(201);
        expect(resposta.body).to.include({
          alunoId,
          disciplinaId: process.env.DISCIPLINA_ID,
          titulo: caso.trabalho.titulo,
          status: 'entregue',
        });
        expect(resposta.body).to.have.property('id');
      });
    });
  });
});
