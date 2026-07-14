import { useRef, useState } from 'react';
import {
  closestCenter,
  CollisionDetection,
  DragEndEvent,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { walletsService, type Wallets } from '@/features/wallets/services/walletsService';
import { buildNextWallets } from '../utils/sortWallets';

const INCLUDE_ZONE_ID = 'include-zone';
const EXCLUDE_ZONE_ID = 'exclude-zone';

export function useWalletDragDrop(
  wallets: Wallets[],
  setWallets: React.Dispatch<React.SetStateAction<Wallets[]>>,
  fetchWallets: () => Promise<void>,
) {
  const [dragOverSection, setDragOverSection] = useState<'include' | 'exclude' | null>(null);
  const dragOverSectionRef = useRef<'include' | 'exclude' | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const setCurrentDragSection = (section: 'include' | 'exclude' | null) => {
    dragOverSectionRef.current = section;
    setDragOverSection(section);
  };

  const collisionDetection: CollisionDetection = (args) => {
    const pointerHits = pointerWithin(args).filter(
      (hit) => String(hit.id) !== String(args.active.id),
    );
    return pointerHits.length > 0 ? pointerHits : closestCenter(args);
  };

  const persistMove = async (
    sourceWallet: Wallets,
    nextWallets: Wallets[],
    targetIncludeFromTotal: boolean,
  ) => {
    const includeChanged = !sourceWallet.excludeFromTotal !== targetIncludeFromTotal;
    setWallets(nextWallets);
    try {
      if (includeChanged) {
        await walletsService.update(sourceWallet.id, { excludeFromTotal: !targetIncludeFromTotal });
      }
      await walletsService.reorder(nextWallets.map((w) => w.id));
    } catch { /* revert handled by re-fetch */ } finally {
      await fetchWallets();
      setCurrentDragSection(null);
    }
  };

  const handleDragOver = ({ over }: { over: DragEndEvent['over'] }) => {
    if (!over) { setCurrentDragSection(null); return; }
    const overId = String(over.id);
    if (overId === INCLUDE_ZONE_ID) { setCurrentDragSection('include'); return; }
    if (overId === EXCLUDE_ZONE_ID) { setCurrentDragSection('exclude'); return; }
    const hoveredWallet = wallets.find((w) => w.id === Number(overId));
    setCurrentDragSection(hoveredWallet ? (hoveredWallet.excludeFromTotal ? 'exclude' : 'include') : null);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    const fromId = Number(active.id);
    const sourceWallet = wallets.find((w) => w.id === fromId);
    if (!sourceWallet) { setCurrentDragSection(null); return; }

    const fallbackTargetIncludeFromTotal =
      dragOverSectionRef.current === null ? null : dragOverSectionRef.current === 'include';

    if (!over) {
      if (fallbackTargetIncludeFromTotal === null) { setCurrentDragSection(null); return; }
      const nextWallets = buildNextWallets(wallets, fromId, fallbackTargetIncludeFromTotal);
      if (!nextWallets) return;
      await persistMove(sourceWallet, nextWallets, fallbackTargetIncludeFromTotal);
      return;
    }

    const overId = String(over.id);
    if (Number(overId) === fromId) {
      if (fallbackTargetIncludeFromTotal !== null && fallbackTargetIncludeFromTotal !== !sourceWallet.excludeFromTotal) {
        const nextWallets = buildNextWallets(wallets, fromId, fallbackTargetIncludeFromTotal);
        if (!nextWallets) return;
        await persistMove(sourceWallet, nextWallets, fallbackTargetIncludeFromTotal);
      } else { setCurrentDragSection(null); }
      return;
    }

    if (overId === INCLUDE_ZONE_ID || overId === EXCLUDE_ZONE_ID) {
      const targetIncludeFromTotal = overId === INCLUDE_ZONE_ID;
      const nextWallets = buildNextWallets(wallets, fromId, targetIncludeFromTotal);
      if (!nextWallets) return;
      await persistMove(sourceWallet, nextWallets, targetIncludeFromTotal);
      return;
    }

    const targetWallet = wallets.find((w) => w.id === Number(overId));
    if (!targetWallet) { setCurrentDragSection(null); return; }
    const targetIncludeFromTotal = !targetWallet.excludeFromTotal;
    const nextWallets = buildNextWallets(wallets, fromId, targetIncludeFromTotal, targetWallet.id);
    if (!nextWallets) { setCurrentDragSection(null); return; }
    await persistMove(sourceWallet, nextWallets, targetIncludeFromTotal);
  };

  return {
    INCLUDE_ZONE_ID,
    EXCLUDE_ZONE_ID,
    sensors,
    dragOverSection,
    collisionDetection,
    handleDragOver,
    handleDragEnd,
    handleDragCancel: () => setCurrentDragSection(null),
  };
}
