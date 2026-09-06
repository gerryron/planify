import { toast } from 'sonner';
import { asyncToast } from './asyncHelper';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe('asyncToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the result and show a success toast', async () => {
    const result = await asyncToast(() => Promise.resolve(42), {
      success: 'Done',
      error: 'Failed',
    });
    expect(result).toBe(42);
    expect(toast.success).toHaveBeenCalledWith('Done');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('should return undefined and show an error toast on failure', async () => {
    const result = await asyncToast(
      () => Promise.reject(new Error('boom')),
      { success: 'Done', error: 'Failed' },
    );
    expect(result).toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith('Failed');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('should not rethrow synchronous errors', async () => {
    const result = await asyncToast(
      () => {
        throw new Error('sync boom');
      },
      { success: 'Done', error: 'Failed' },
    );
    expect(result).toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith('Failed');
  });
});
