// src/types/index.ts

export type LoginData = {
  email: string;
  password: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  role: 'admin' | 'vendedor';
  store_id: string | null;
  stores?: {
    name: string;
  } | null;
};

export type Store = {
  id: string;
  name: string;
  address: string | null;
  created_at?: string;
};

export type Category = {
  id: number;
  name: string;
  created_at?: string;
};


export type Product = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category_id: number;
  created_at?: string;
};

export type StoreProductLink = {
  store_id: string;
  product_id: string;
  price: number;
  /** false = el producto sigue asignado a la tienda (con su precio) pero no aparece en el POS */
  is_active: boolean;
  stores?: {
    name: string;
  } | null;
};

export type ProductWithDetails = Product & {
  categories: {
    name: string;
  } | null;
  store_products: StoreProductLink[];
};

export type CartItem = {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
  quantity: number;
};

export interface CartState {
  /** Tienda a la que pertenece el pedido actual (los precios son por tienda) */
  storeId: string | null;
  items: CartItem[];
  /** Cambia la tienda del pedido. Si es distinta a la actual, vacía el carrito. */
  setStore: (storeId: string | null) => void;
  addToCart: (product: ProductWithDetails, price: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, newQuantity: number) => void;
  /** Actualiza el precio de un ítem (cuando la BD avisa que el precio cambió) */
  updatePrice: (productId: string, newPrice: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotal: () => number;
}

export type PaymentMethod = {
  id: number;
  name: string;
  description: string | null;
  created_at?: string;
};

export type Sale = {
  id: string;
  created_at: string;
  store_id: string;
  user_id: string;
  total_amount: number;
  payment_method_id: number | null;
  paid_amount: number;
  change_amount: number;

  stores?: { name: string; } | null;
  profiles?: { full_name: string; } | null;
  payment_methods?: { name: string; } | null;

  sale_items?: SaleItemWithProduct[] | null;
};

export type SaleItem = {
  id: number;
  sale_id: string;
  product_id: string;
  quantity: number;
  price_at_sale: number;
};

export type SaleItemWithProduct = SaleItem & {
  products?: {
    name: string;
    image_url: string | null;
  } | null;
};

export type CashShift = {
  id: number;
  store_id: string;
  user_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  closing_balance: number | null;
  calculated_sales: number | null;

  stores?: { name: string; } | null;
  profiles?: { full_name: string; } | null;
};

export type ReportSalesByStoreResult = {
  store_id: string;
  store_name: string;
  total_sales: number;
};

export type ReportSalesByProductResult = {
  product_id: string;
  product_name: string;
  category_name: string;
  total_sales: number;
  total_quantity: number;
};

export type ReportTopSoldProductsResult = {
  product_id: string;
  product_name: string;
  category_name: string;
  total_quantity: number;
  total_sales: number;
};

export type DailyCashSummaryResult = {
  store_id:          string;
  store_name:        string;
  report_date:       string;
  opening_balance:   number;
  total_sales_day:   number;
  total_day_balance: number;
};

export type ReportSalesByPaymentMethodResult = {
  payment_method_id: number;
  payment_method_name: string;
  total_sales: number;
};

export type ReportTotalSalesSummaryResult = {
  total_sales: number;
  total_customers: number;
  total_products_sold: number;
};

export interface DailyProductSummary {
  product_name: string;
  total_qty: number;
  unit_price: number;
  subtotal: number;
}

export type V2ReportSalesByProductResult = {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_sales: number;
};

export type V3ReportSalesByProductResult = {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_sales: number;
};

export type DetailedSaleExportRow = {
  sale_id: string;
  sale_date: string;
  store_name: string;
  seller_name: string;
  payment_method: string;
  sale_total: number;
  product_name: string;
  quantity: number;
  price_at_sale: number;
  item_subtotal: number;
};

export type V2ReportSalesByPaymentMethodResult = {
  payment_method_name: string;
  total_sales: number;
};

export type V2DailyCashSummaryResult = {
  store_id: string;
  store_name: string;
  report_date: string;
  opening_balance: number;
  total_sales_day: number;
  total_day_balance: number;
};

export type V3DailyCashSummaryResult = {
  store_id: string;
  store_name: string;
  report_date: string;
  opening_balance: number;
  total_sales_day: number;
  total_day_balance: number;
  total_counted: number;
  total_difference: number;
};