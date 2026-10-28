import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('genera un hash distinto de la contraseña y lo verifica', async () => {
    const hash = await service.hash('Secret123!');

    expect(hash).not.toBe('Secret123!');
    await expect(service.verify(hash, 'Secret123!')).resolves.toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await service.hash('Secret123!');

    await expect(service.verify(hash, 'Otra123!')).resolves.toBe(false);
  });

  it('devuelve false ante un hash inválido en lugar de lanzar', async () => {
    await expect(service.verify('no-es-un-hash', 'Secret123!')).resolves.toBe(false);
  });
});
