import { useQuery } from '@tanstack/react-query';
import { walletsService, type Wallets } from '../services/walletsService';
import { QUERY_KEYS } from '@/lib/queryClient';

export function useWallets() {
  return useQuery<Wallets[]>({
    queryKey: QUERY_KEYS.WALLETS,
    queryFn: () => walletsService.getAll(),
  });
}

export function useWallet(id: number) {
  return useQuery<Wallets>({
    queryKey: QUERY_KEYS.WALLET(id),
    queryFn: async () => {
      const wallets = await walletsService.getAll();
      const wallet = wallets.find((w) => w.id === id);
      if (!wallet) throw new Error(`Wallet ${id} not found`);
      return wallet;
    },
  });
}
