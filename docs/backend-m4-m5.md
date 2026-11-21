# M4 Shop + M5 Bar POS - how it runs

Both modules are native Odoo. The addon only ships data: products,
pricelists, POS configs. No custom selling code.

## Discounts apply on their own
- One pricelist per plan: Walk-in, Gold, Silver, Junior.
- Rules are per product category: Gear and Bar and Cafe.
  Gold -15%/-15%, Silver -10%/-10%, Junior -5% on Gear, full price at the bar.
- Set the member's pricelist once (member form, Sales tab) - or leave it:
  POS reads the customer on the order and prices from their pricelist.
- Courts are not in this system: booking prices come from the plan (M3).

## Shop (M4)
- One stock: POS counter sales and website sale orders draw from the
  same Stock location. Opening stock and reordering rules ship as data.
- Low stock: Inventory shows reordering-rule alerts when a product hits
  its minimum (balls 10, rackets 5, bats 3, shoes 5, t-shirts 10).
- Online order: website creates a sale order in Odoo for pickup/delivery;
  staff confirm it at the desk.

## Bar and Cafe (M5)
- Two POS configs: Club Shop and Bar and Cafe, both take Cash / Card / UPI.
- A member tab is an order left open in the POS session; settle before
  closing. No separate tab system to build.
- Daily earnings: close the session - POS session report is the day's
  bar/shop total, and it feeds the owner dashboard (M8).

## One setup step after install
Point of Sale > Configuration > Payment Methods: link Cash/Card/UPI to
their journals (Cash journal for cash, Bank for card/UPI). Two minutes,
done once in the UI - journals differ per install, so this is not data.
