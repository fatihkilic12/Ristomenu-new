import { useCallback, useEffect, useState } from 'react';

export type CustomerDetails = {
  name: string;
  phone: string;
  email: string;
  street: string;
  streetNumber: string;
  postalCode: string;
  city: string;
};

const EMPTY: CustomerDetails = {
  name: '', phone: '', email: '',
  street: '', streetNumber: '', postalCode: '', city: '',
};

const KEY = (storeId: string) => `customer-details-${storeId}`;

function read(storeId: string): CustomerDetails {
  try {
    const raw = localStorage.getItem(KEY(storeId));
    if (!raw) return EMPTY;
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch { return EMPTY; }
}

function write(storeId: string, details: CustomerDetails) {
  try { localStorage.setItem(KEY(storeId), JSON.stringify(details)); } catch { /* ignore */ }
}

export function useCustomerDetails(storeId: string | undefined) {
  const [details, setDetails] = useState<CustomerDetails>(() => storeId ? read(storeId) : EMPTY);

  useEffect(() => {
    if (storeId) setDetails(read(storeId));
  }, [storeId]);

  const update = useCallback(<K extends keyof CustomerDetails>(key: K, value: CustomerDetails[K]) => {
    setDetails(prev => ({ ...prev, [key]: value }));
  }, []);

  const persist = useCallback((d: CustomerDetails = details) => {
    if (storeId) write(storeId, d);
  }, [storeId, details]);

  return { details, setDetails, update, persist };
}
