import mongoose from 'mongoose';

// Hook global: fecha a conexão com o MongoDB uma única vez, depois de todos os arquivos de teste.
export const mochaHooks = {
  async afterAll() {
    await mongoose.connection.close();
  },
};
