import { parsePagination } from './pagination';

describe('parsePagination', () => {
  it('varsayılan page ve limit döner', () => {
    expect(parsePagination(undefined)).toEqual({ page: 1, limit: 50, skip: 0 });
  });

  it('string query parametrelerini sayıya çevirir', () => {
    expect(parsePagination({ page: '2', limit: '100' })).toEqual({
      page: 2,
      limit: 100,
      skip: 100,
    });
  });

  it('geçersiz değerlerde varsayılanları kullanır', () => {
    expect(parsePagination({ page: 'abc', limit: '' })).toEqual({
      page: 1,
      limit: 50,
      skip: 0,
    });
  });

  it('limit üst sınırını 500 ile sınırlar', () => {
    expect(parsePagination({ limit: '9999' }).limit).toBe(500);
  });

  it('page en az 1 olur', () => {
    expect(parsePagination({ page: '-5' }).page).toBe(1);
  });
});
