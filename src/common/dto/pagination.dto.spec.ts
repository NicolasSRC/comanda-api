import { paginated, paginationArgs } from './pagination.dto';

describe('paginación', () => {
  it('calcula skip y take a partir de página y límite', () => {
    expect(paginationArgs(1, 20)).toEqual({ skip: 0, take: 20 });
    expect(paginationArgs(3, 10)).toEqual({ skip: 20, take: 10 });
  });

  it('construye metadatos con el total de páginas', () => {
    expect(paginated(['a', 'b'], 42, 2, 20)).toEqual({
      data: ['a', 'b'],
      meta: { page: 2, limit: 20, total: 42, totalPages: 3 },
    });
  });

  it('devuelve cero páginas cuando no hay resultados', () => {
    expect(paginated([], 0, 1, 20).meta.totalPages).toBe(0);
  });
});
