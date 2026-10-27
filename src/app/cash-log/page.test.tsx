/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CashLogPage from './page';
import { walletsService } from '@/features/wallets/services/walletsService';

const mockSearchParams = new URLSearchParams();
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  __esModule: true,
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => '/cash-log',
}));

jest.mock('@/features/cash-log/components/CashLogList', () => ({
  __esModule: true,
  default: () => <div>CashLogList</div>,
}));

jest.mock('@/features/cash-log/components/CashLogForm', () => ({
  __esModule: true,
  default: ({ defaultWalletName }: { defaultWalletName?: string | null }) => (
    <div>{defaultWalletName ?? 'missing-wallet'}</div>
  ),
}));

jest.mock('@/shared/utils/useModalKeyboard', () => ({
  useModalKeyboard: () => ({
    containerRef: { current: null },
  }),
}));

jest.mock('@/features/wallets/services/walletsService', () => ({
  walletsService: {
    getAll: jest.fn(),
  },
}));

describe('CashLogPage', () => {
  beforeEach(() => {
    mockSearchParams.delete('walletId');
    mockSearchParams.delete('new');
    jest.clearAllMocks();
    (walletsService.getAll as jest.Mock).mockResolvedValue([
      {
        id: 42,
        name: 'Cash',
        balance: 150000,
        excludeFromTotal: false,
        walletKind: 'basic',
        goalAmount: null,
        goalStartMonth: null,
        goalDueMonth: null,
        creditLimit: null,
        statementDay: null,
        dueDay: null,
      },
    ]);
  });

  it('opens the add-new form with the selected wallet prefilled when invoked from a wallet action', async () => {
    mockSearchParams.set('walletId', '42');
    mockSearchParams.set('new', '1');

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CashLogPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(walletsService.getAll).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Cash')).toBeInTheDocument();
  });
});
