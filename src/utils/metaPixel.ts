// src/utils/metaPixel.ts
// Helper functions to track standard Meta (Facebook) Pixel events:
// PageView, ViewContent, AddToCart, InitiateCheckout, Purchase, etc.

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

/** Check if fbq is loaded and available */
export const isMetaPixelReady = (): boolean => {
  return typeof window !== "undefined" && typeof window.fbq === "function";
};

/** Track PageView on route navigation */
export const trackMetaPageView = (): void => {
  if (isMetaPixelReady()) {
    window.fbq!("track", "PageView");
  }
};

/** Track ViewContent when viewing a single product page */
export const trackMetaViewContent = (product: {
  id: string;
  name: string;
  price: number;
  category?: string;
  currency?: string;
}): void => {
  if (isMetaPixelReady()) {
    window.fbq!("track", "ViewContent", {
      content_name: product.name,
      content_ids: [product.id],
      content_type: "product",
      value: product.price,
      currency: product.currency || "INR",
      content_category: product.category,
    });
  }
};

/** Track AddToCart when customer adds an item to their cart */
export const trackMetaAddToCart = (item?: {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
  currency?: string;
}): void => {
  if (isMetaPixelReady()) {
    if (item && item.name) {
      window.fbq!("track", "AddToCart", {
        content_name: item.name,
        content_ids: item.id ? [item.id] : undefined,
        content_type: "product",
        value: (item.price || 0) * (item.quantity || 1),
        currency: item.currency || "INR",
      });
    } else {
      window.fbq!("track", "AddToCart");
    }
  }
};

/** Track InitiateCheckout when customer enters the checkout page */
export const trackMetaInitiateCheckout = (data: {
  numItems: number;
  totalValue: number;
  currency?: string;
}): void => {
  if (isMetaPixelReady()) {
    window.fbq!("track", "InitiateCheckout", {
      num_items: data.numItems,
      value: data.totalValue,
      currency: data.currency || "INR",
    });
  }
};

/** Track Purchase when an order is successfully completed */
export const trackMetaPurchase = (order?: {
  orderId?: string;
  amount?: number;
  value?: number;
  currency?: string;
  numItems?: number;
  num_items?: number;
  content_ids?: string[];
}): void => {
  if (isMetaPixelReady()) {
    const val = typeof order?.value === "number" ? order.value : (typeof order?.amount === "number" ? order.amount : 0);
    const curr = order?.currency || "INR";
    window.fbq!("track", "Purchase", {
      value: val,
      currency: curr,
      ...(order?.content_ids ? { content_ids: order.content_ids } : {}),
      ...(order?.numItems || order?.num_items ? { num_items: order?.numItems || order?.num_items } : {}),
      ...(order?.orderId ? { order_id: order.orderId } : {}),
      content_type: "product",
    });
  }
};
