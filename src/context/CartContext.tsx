import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { placeOrder } from '@/actions/order';

export type CartItem = {
  id: string;
  product: number;
  product_data?: Record<string, any>;
  options_data?: Record<string, any>[];
  quantity: number;
  note?: string;
  options?: Record<string, any>;
};

type CartState = { items: CartItem[]; note: string; desiredTime?: string | null };

type CartContextType = {
  cart: CartItem[];
  note: string;
  /** ISO datetime selected from the pre-order picker, or null/undefined for "ASAP". */
  desiredTime: string | null;
  setDesiredTime: (iso: string | null) => void;
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  updateCart: (id: string, item: CartItem) => void;
  deleteFromCart: (id: string) => void;
  resetCart: () => void;
  setNote: (note: string) => void;
  submitOrder: (extra?: Record<string, any>) => Promise<any>;
  total: number;
  itemCount: number;
};

const CartContext = createContext<CartContextType | null>(null);

function loadCart(key: string): CartState {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Defensive: older versions of the cart didn't persist `desiredTime`.
      // Make sure the shape is consistent so downstream code never sees an
      // accidental `undefined` vs `null` mismatch.
      return {
        items: parsed.items || [],
        note: parsed.note || '',
        desiredTime: parsed.desiredTime ?? null,
      };
    }
  } catch { /* ignore */ }
  return { items: [], note: '', desiredTime: null };
}

function saveCart(key: string, cart: CartState) {
  localStorage.setItem(key, JSON.stringify(cart));
}

type Props = {
  storeId: string;
  table?: string | null;
  orderType?: string;
  customerName?: string;
  children: ReactNode;
};

export function CartProvider({ storeId, table, orderType, customerName, children }: Props) {
  const storageKey = `cart-${storeId}`;
  const [cart, setCartState] = useState<CartState>(() => loadCart(storageKey));

  useEffect(() => { saveCart(storageKey, cart); }, [cart, storageKey]);

  const setCart = useCallback((c: CartState) => setCartState(c), []);

  const addToCart = useCallback((item: Omit<CartItem, 'id'>) => {
    setCartState(prev => {
      // Merge duplicates
      const dup = prev.items.find(i =>
        i.product === item.product &&
        i.note === item.note &&
        shallowEqual(i.options, item.options)
      );
      if (dup) {
        return {
          ...prev,
          items: prev.items.map(i => i.id === dup.id ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i),
        };
      }
      return { ...prev, items: [...prev.items, { ...item, id: uuidv4() }] };
    });
  }, []);

  const updateCart = useCallback((id: string, updated: CartItem) => {
    setCartState(prev => ({ ...prev, items: prev.items.map(i => i.id === id ? { ...i, ...updated } : i) }));
  }, []);

  const deleteFromCart = useCallback((id: string) => {
    setCartState(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  }, []);

  const resetCart = useCallback(() => setCartState({ items: [], note: '', desiredTime: null }), []);

  const setNote = useCallback((note: string) => {
    setCartState(prev => ({ ...prev, note }));
  }, []);

  const setDesiredTime = useCallback((iso: string | null) => {
    setCartState(prev => ({ ...prev, desiredTime: iso }));
  }, []);

  const submitOrder = useCallback(async (extra?: Record<string, any>) => {
    const items = cart.items.map(i => ({
      product: i.product,
      quantity: i.quantity,
      note: i.note || '',
      options: i.options ? Object.entries(i.options).map(([itemId, qty]) => ({
        item: Number(itemId),
        quantity: qty as number,
      })) : [],
    }));
    const payload: Record<string, any> = { items, note: cart.note || '' };
    if (table) payload.table = table;
    if (orderType) payload.order_type = orderType;
    if (customerName) payload.customer_name = customerName;
    // Pre-order: only attach `desired_time` when the customer explicitly picked
    // one. Null/undefined means "ASAP" — the backend treats omitted as ASAP and
    // we deliberately don't send the key in that case so we don't accidentally
    // ship the empty string.
    if (cart.desiredTime) payload.desired_time = cart.desiredTime;
    if (extra) Object.assign(payload, extra);
    return placeOrder(storeId, payload);
  }, [cart, storeId, table, orderType, customerName]);

  const total = useMemo(() => cart.items.reduce((s, i) => s + i.quantity, 0), [cart.items]);

  const value = useMemo<CartContextType>(() => ({
    cart: cart.items,
    note: cart.note,
    desiredTime: cart.desiredTime ?? null,
    setDesiredTime,
    addToCart, updateCart, deleteFromCart, resetCart, setNote, submitOrder,
    total: 0, // Calculated from prices in menu context
    itemCount: total,
  }), [cart, addToCart, updateCart, deleteFromCart, resetCart, setNote, setDesiredTime, submitOrder, total]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

function shallowEqual(a?: Record<string, any>, b?: Record<string, any>): boolean {
  if (a === b) return true;
  if (!a || !b) return a === b;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => a[k] === b[k]);
}
