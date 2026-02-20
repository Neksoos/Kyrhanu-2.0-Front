// app/types/items.ts
export type InventoryItemDTO = {
  id: number;                 // id запису в player_inventory
  item_id: number;            // id з items
  item_code: string;
  emoji: string | null;
  name: string;
  description: string | null;
  rarity: string | null;
  slot: string | null;
  // На бекенді це Dict[str, Any], але для React зробимо number | string
  stats: Record<string, number | string>;
  amount: number;
  is_equipped: boolean;
};