import client from 'shared/client';

jest.mock('shared/client');

// Delete this test in your copy
describe('sample test', () => {
  it('should always pass', () => {
    expect(client).toBeTruthy();
  });
});
