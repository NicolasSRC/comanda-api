import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/** Hash de contraseñas con Argon2id (REQUERIMIENTOS.md §5.1). */
@Injectable()
export class PasswordService {
  private readonly options: argon2.HashOptions = {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  };

  hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, { ...this.options, raw: false });
  }

  async verify(passwordHash: string, plainPassword: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, plainPassword);
    } catch {
      return false;
    }
  }
}
