/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { useModalKeyboard } from './useModalKeyboard';

function Harness({
  enabled = true,
  onClose,
}: {
  enabled?: boolean;
  onClose: () => void;
}) {
  const { containerRef } = useModalKeyboard({ onClose, enabled });
  return (
    <div ref={containerRef}>
      <button>First</button>
      <input aria-label="middle-input" />
      <button>Last</button>
    </div>
  );
}

describe('useModalKeyboard', () => {
  let rafSpy: jest.SpyInstance;

  beforeEach(() => {
    // Make requestAnimationFrame synchronous so auto-focus is deterministic.
    rafSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      });
  });

  afterEach(() => {
    rafSpy.mockRestore();
  });

  it('should auto-focus the first focusable element on mount', () => {
    const { getByText } = render(<Harness onClose={jest.fn()} />);
    expect(document.activeElement).toBe(getByText('First'));
  });

  it('should close the modal on Escape', () => {
    const onClose = jest.fn();
    render(<Harness onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should wrap Tab from the last focusable to the first', () => {
    const { getByText } = render(<Harness onClose={jest.fn()} />);
    const first = getByText('First');
    const last = getByText('Last');
    last.focus();
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('should wrap Shift+Tab from the first focusable to the last', () => {
    const { getByText } = render(<Harness onClose={jest.fn()} />);
    const first = getByText('First');
    const last = getByText('Last');
    first.focus();
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('should skip disabled elements when focusing', () => {
    const onClose = jest.fn();
    function DisabledFirstHarness() {
      const { containerRef } = useModalKeyboard({ onClose });
      return (
        <div ref={containerRef}>
          <button disabled>Disabled</button>
          <button>Enabled</button>
        </div>
      );
    }
    const { getByText } = render(<DisabledFirstHarness />);
    expect(document.activeElement).toBe(getByText('Enabled'));
  });

  it('should not attach listeners or focus when disabled', () => {
    const onClose = jest.fn();
    render(<Harness enabled={false} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should remove the listener on unmount', () => {
    const onClose = jest.fn();
    const { unmount } = render(<Harness onClose={onClose} />);

    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should re-attach when enabled toggles on', () => {
    const onClose = jest.fn();
    const { rerender } = render(<Harness enabled={false} onClose={onClose} />);

    act(() => {
      rerender(<Harness enabled={true} onClose={onClose} />);
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
