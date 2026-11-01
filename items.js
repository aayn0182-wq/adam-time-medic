// Central item registry + Inventory. Pure data/logic, no rendering -> easy to serialize and
// to transfer between players later (co-op: Inventory.transfer(from, to, id, n)).
export const ITEMS = {
  plaster:  { name: 'Plaster',      icon: '🩹', kind: 'tool', consumable: true,  tier: 1, treats: ['cut'],                              hits: 3, keys: 5, zone: 0.18, price: 8 },
  bandage:  { name: 'Bandage',      icon: '🧻', kind: 'tool', consumable: true,  tier: 2, treats: ['cut', 'bleed', 'sprain'],           hits: 3, keys: 4, zone: 0.22, price: 12 },
  kit:      { name: 'First-aid kit',icon: '🧰', kind: 'tool', consumable: true,  tier: 3, treats: ['cut', 'bleed', 'burn', 'sprain'],   hits: 2, keys: 3, zone: 0.28, price: 30 },
  splint:   { name: 'Splint',       icon: '🦴', kind: 'tool', consumable: true,  tier: 3, treats: ['fracture'],                         hits: 2, keys: 3, zone: 0.26, price: 30 },
  defib:    { name: 'Defibrillator',icon: '⚡', kind: 'tool', consumable: false, tier: 4, treats: ['cardiac', 'unconscious', 'cut', 'bleed'], hits: 1, keys: 2, zone: 0.34, price: 150 },
  water:    { name: 'Water',        icon: '💧', kind: 'use',  consumable: true,  thirst: 45, cool: 0.9, price: 6, treats: ['smoke'], hits: 2, keys: 3, zone: 0.3, tier: 1 },
  food:     { name: 'Bread',        icon: '🍞', kind: 'use',  consumable: true,  hunger: 40, heal: 12, price: 6 },
  mask:     { name: 'Mask',         icon: '😷', kind: 'wear', consumable: false, price: 25, treats: ['smoke'], hits: 2, keys: 3, zone: 0.3, tier: 2 },
  salts:    { name: 'Smelling salts',icon: '🧂', kind: 'tool', consumable: true, tier: 2, treats: ['unconscious'],                      hits: 2, keys: 3, zone: 0.26, price: 20 },
};
export const HOTBAR = ['plaster', 'bandage', 'kit', 'splint', 'defib', 'water', 'food', 'mask', 'salts'];
export const INJURIES = {
  cut:         { label: 'Cut',              walk: true,  cr: 30, pose: 'sit' },
  bleed:       { label: 'Heavy bleeding',   walk: true,  cr: 40, pose: 'sit' },
  burn:        { label: 'Burn',             walk: true,  cr: 45, pose: 'sit' },
  sprain:      { label: 'Sprained ankle',   walk: true,  cr: 35, pose: 'sit' },
  smoke:       { label: 'Smoke inhalation', walk: true,  cr: 40, pose: 'cough' },
  fracture:    { label: 'Broken leg',       walk: false, cr: 60, pose: 'sit' },
  unconscious: { label: 'Unconscious',      walk: true,  cr: 55, pose: 'lie' },
  cardiac:     { label: 'Cardiac arrest',   walk: false, cr: 80, pose: 'lie' },
};
export class Inventory {
  constructor(items = {}, cap = 12) { this.items = { ...items }; this.cap = cap; }
  count(id) { return this.items[id] || 0; }
  has(id, n = 1) { return this.count(id) >= n; }
  add(id, n = 1) { if (!ITEMS[id]) return 0; const k = Math.max(0, Math.min(n, this.cap - this.count(id))); this.items[id] = this.count(id) + k; return k; }
  remove(id, n = 1) { if (!this.has(id, n)) return false; this.items[id] -= n; return true; }
  static transfer(from, to, id, n = 1) { if (!from.has(id, n)) return 0; const k = to.add(id, n); from.items[id] -= k; return k; }
  // best owned tool able to treat an injury type (prefer higher tier, then non-consumables)
  bestFor(type, prefer) {
    if (prefer && this.has(prefer) && ITEMS[prefer].treats?.includes(type)) return prefer;
    return HOTBAR.filter(id => ITEMS[id].treats && ITEMS[id].treats.includes(type) && this.has(id)).sort((a, b) => ITEMS[a].tier - ITEMS[b].tier)[0] || null;
  }
  toJSON() { return { items: this.items, cap: this.cap }; }
}
