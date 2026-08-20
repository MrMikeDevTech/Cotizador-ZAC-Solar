// Borrador del modelo de datos (PROJECT_PLAN.md, sección 4).
// Reglas: IDs UUID v4 del cliente, soft delete (deleted_at), synced_at nullable.

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at: string | null;
  origin_device_id?: string | null;
}

export interface Client extends BaseEntity {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface Product extends BaseEntity {
  sku: string;
  name: string;
  category: "panel" | "inverter" | "structure" | "labor" | "other";
  unit_price: number;
  currency: string;
}

export interface Quote extends BaseEntity {
  client_id: string;
  user_id: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  total: number;
  currency: string;
}

export interface QuoteItem extends BaseEntity {
  quote_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface User extends BaseEntity {
  name: string;
  email: string;
  role: "seller" | "technician" | "admin";
}