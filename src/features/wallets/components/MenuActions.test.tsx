/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import MenuActions from './MenuActions';

describe('MenuActions', () => {
  it('includes the quick transaction action and calls its callback', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const onTransaction = jest.fn();

    render(
      <MenuActions
        onEdit={onEdit}
        onDelete={onDelete}
        onTransaction={onTransaction}
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Transaction'));

    expect(onTransaction).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
