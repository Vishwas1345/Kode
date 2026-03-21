import { create } from "zustand";

interface PremiumModalState {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
}

export const usePremiumModal = create<PremiumModalState>((set) => ({
    isOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
}));
