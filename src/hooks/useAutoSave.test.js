import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('useAutoSave', () => {
  it('returns "idle" on first render and does not call saveFn', () => {
    const saveFn = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave('resume-1', { name: 'test' }, saveFn)
    );
    expect(result.current).toBe('idle');
    expect(saveFn).not.toHaveBeenCalled();
  });

  it('returns "idle" when resumeId is null', () => {
    const saveFn = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave(null, { name: 'test' }, saveFn));
    act(() => { jest.runAllTimers(); });
    expect(saveFn).not.toHaveBeenCalled();
    expect(result.current).toBe('idle');
  });

  it('transitions to "saving" immediately when data changes after first render', () => {
    const saveFn = jest.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave('r1', data, saveFn),
      { initialProps: { data: { name: 'a' } } }
    );
    act(() => { rerender({ data: { name: 'b' } }); });
    expect(result.current).toBe('saving');
  });

  it('calls saveFn after 1-second debounce', async () => {
    const saveFn = jest.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ data }) => useAutoSave('r1', data, saveFn),
      { initialProps: { data: { name: 'a' } } }
    );
    act(() => { rerender({ data: { name: 'b' } }); });
    expect(saveFn).not.toHaveBeenCalled();

    await act(async () => { jest.runAllTimers(); });
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith('r1', { name: 'b' });
  });

  it('debounces multiple rapid changes — only saves the last value', async () => {
    const saveFn = jest.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ data }) => useAutoSave('r1', data, saveFn),
      { initialProps: { data: { v: 0 } } }
    );
    act(() => { rerender({ data: { v: 1 } }); });
    act(() => { rerender({ data: { v: 2 } }); });
    act(() => { rerender({ data: { v: 3 } }); });

    await act(async () => { jest.runAllTimers(); });
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith('r1', { v: 3 });
  });

  it('transitions to "saved" after successful save', async () => {
    const saveFn = jest.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave('r1', data, saveFn),
      { initialProps: { data: { name: 'a' } } }
    );
    act(() => { rerender({ data: { name: 'b' } }); });
    await act(async () => { jest.runAllTimers(); });
    expect(result.current).toBe('saved');
  });

  it('transitions to "error" when saveFn rejects', async () => {
    const saveFn = jest.fn().mockRejectedValue(new Error('DB error'));
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave('r1', data, saveFn),
      { initialProps: { data: { name: 'a' } } }
    );
    act(() => { rerender({ data: { name: 'b' } }); });
    await act(async () => { jest.runAllTimers(); });
    expect(result.current).toBe('error');
  });
});
