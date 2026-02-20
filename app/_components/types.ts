// app/_components/types.ts (якщо хочеш окремо)
// або просто продублюй тип там, де треба

export type InventoryItem = {
  id: string;
  name: string;
  icon: string;            // emoji або шлях до картинки
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  kind: string;            // тип предмета: "трава", "меч", "зілля"
  description: string;
  quantity: number;

  // необов’язково, але корисно:
  effects?: string[];      // ["HP +10", "Nasnaga +3"]
  price?: number;          // в червонцях
};