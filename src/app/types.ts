export type Product = {
  id: number;
  name: string;
  sku?: string;
  sku_externo?: string;
  stock_quantity?: number;
  min_stock?: number;
  cost_price?: number;
  image_url?: string;
  commercial_description?: string;
  genera_diseno?: boolean;
  diseno_template_url?: string;
  category_id?: number;
  brand_id?: number;
  category_name: string;
  brand_name: string;
  price: number;
  unit: string;
  stock?: number;
  discontinued?: number;
  requires_stock?: boolean;
  has_attributes?: boolean;
  description?: string;
  technical_info?: string;
};

export type Category = {
  id: number;
  name: string;
  sku_prefix?: string;
};

export type Client = {
  id: number;
  name: string;
  phone: string;
  location?: string;
  address: string;
  notes?: string;
  email?: string;
  lat?: number;
  lng?: number;
  created_at: string;
};

export type OrderItem = {
  id?: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export type Order = {
  id: number;
  order_number?: string;
  client_id: number;
  client_name: string;
  client_phone?: string;
  items: string;
  total: number;
  status: "pending" | "confirmed" | "delivered" | "cancelled";
  payment: string;
  payment_status?: "pending" | "paid";
  payment_method?: string;
  delivery_address?: string;
  delivery_fee?: number;
  scheduled_date?: string;
  scheduled_time?: string;
  notes?: string;
  created_at: string;
  delivered_date?: string;
  sale_channel_has_delivery?: boolean;
  immediate_delivery?: boolean;
};

export type OrderDetail = {
  id: number;
  order_number: string;
  client_id: number;
  contact_id: number;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  seller_id: number;
  seller_name: string;
  seller_rol: string;
  sale_channel_id: number;
  sale_channel_name: string;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  delivery_fee: number;
  total: number;
  payment_method_id: number;
  payment_method_name: string;
  order_status_id: number;
  order_status_name: string;
  order_status_color: string;
  payment_status_id: number;
  payment_status_name: string;
  payment_status_color: string;
  payment_paid: number;
  payment_pending: number;
  notes: string;
  items: OrderItem[];
  payments: OrderPayment[];
  delivery: Delivery | null;
  factura_id?: number | null;
  factura_cae?: string | null;
  factura_resultado?: string | null;
  factura_tipo?: number | null;
  factura_numero?: number | null;
  nc_id?: number | null;
  nc_cae?: string | null;
  nc_numero?: number | null;
  created_at: string;
  updated_at: string;
};

export type SaleChannel = {
  id: number;
  client_id: number;
  name: string;
  is_active: boolean;
  sort_order: number;
  has_delivery: boolean;
  immediate_delivery: boolean;
};

export type OrderStatus = {
  id: number;
  client_id: number;
  name: string;
  color: string;
  sort_order: number;
  is_active: boolean;
};

export type PaymentStatus = {
  id: number;
  client_id: number;
  name: string;
  color: string;
  sort_order: number;
  is_active: boolean;
};

export type OrderPayment = {
  id: number;
  order_id: number;
  amount: number;
  payment_method_id: number;
  payment_method_name: string;
  paid_at: string;
  created_at: string;
};

export type Delivery = {
  id?: number;
  address: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  delivery_fee: number;
  notes: string;
  status: string;
  delivered_date: string;
};

export type User = {
  id: number;
  client_id: number;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  telegram_id?: string;
  is_active?: boolean;
  rol: "admin" | "manager" | "operator" | string;
};

export type PaymentMethod = {
  id: number;
  name: string;
  is_cash?: boolean;
  is_active?: boolean;
};

export type Contact = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  instagram?: string;
  tiktok?: string;
  address?: string;
  city?: string;
  location?: string;
  notes?: string;
  condicion_iva?: string;
  cuit?: string;
  condicion_iibb?: string;
  calificacion?: number;
  entity_id?: number;
};

export type Lead = {
  id: number;
  name: string | null;
  phone: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  location?: string | null;
  source?: string | null;
  source_channel?: string | null;
  notes?: string | null;
  first_message?: string | null;
  first_message_at?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  interaction_count?: number;
  converted_contact_id?: number | null;
  converted_contact_name?: string | null;
  created_at: string;
  updated_at?: string;
  last_interaction_at?: string | null;
  converted_at?: string | null;
  status: "new" | "contacted" | "waiting" | "qualified" | "converted" | "rejected";
};

export type Complaint = {
  id: number;
  order_id?: number;
  client_id?: number;
  client_name?: string;
  product_id?: number;
  product_name?: string;
  title?: string;
  reason: string;
  description: string;
  status: "open" | "investigating" | "resolved";
  created_at: string;
  order_number?: string;
  client_phone?: string;
};

export type DashboardSummary = {
  totalClients: number;
  totalProducts: number;
  ordersToday: number;
  ordersMonth: number;
  ordersPending: number;
  ordersDelivered: number;
  ordersCancelled: number;
  revenueToday: number;
  revenueMonth: number;
  revenueTotal: number;
  pendingDeliveries: number;
  lowStock: number;
  pendingLeads: number;
  openReclamos: number;
  newClientsThisMonth: number;
  averageOrderValue: number;
};
