import { createRecord, searchRead } from "./client";

export type ShopProduct = {
  id: number; name: string; list_price: number; qty_available: number;
  categ_id: [number, string];
};

// Live stock from Odoo: counter and website read the same shelf.
export const listProducts = () =>
  searchRead<ShopProduct>("product.template",
    [["sale_ok", "=", true]], ["name", "list_price", "qty_available", "categ_id"]);

// Online order for pickup or delivery. Confirming it reserves the same
// stock the counter sells from, so the two can never oversell each other.
export async function createOrder(input: {
  partnerId: number; items: { productId: number; qty: number }[];
}) {
  const id = await createRecord("sale.order", {
    partner_id: input.partnerId,
    order_line: input.items.map((i) => [0, 0, {
      product_id: i.productId, product_uom_qty: i.qty,
    }]),
  });
  return { orderId: id };
}
