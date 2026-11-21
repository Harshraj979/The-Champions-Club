from odoo.tests.common import TransactionCase


class TestShop(TransactionCase):
    def _price(self, template_ref, pricelist_ref):
        product = self.env.ref(template_ref).product_variant_id
        pricelist = self.env.ref(pricelist_ref)
        return product.with_context(pricelist=pricelist.id).price

    def test_gold_discounts(self):
        self.assertAlmostEqual(
            self._price("champions_club.prod_racket", "champions_club.pricelist_gold"),
            4999 * 0.85)
        self.assertAlmostEqual(
            self._price("champions_club.prod_coffee", "champions_club.pricelist_gold"),
            250 * 0.85)

    def test_silver_discounts(self):
        self.assertAlmostEqual(
            self._price("champions_club.prod_balls", "champions_club.pricelist_silver"),
            549 * 0.90)

    def test_junior_gear_only(self):
        self.assertAlmostEqual(
            self._price("champions_club.prod_tshirt", "champions_club.pricelist_junior"),
            999 * 0.95)
        # no bar discount for Junior
        self.assertAlmostEqual(
            self._price("champions_club.prod_coffee", "champions_club.pricelist_junior"),
            250.0)

    def test_walkin_pays_full(self):
        self.assertAlmostEqual(
            self._price("champions_club.prod_racket", "champions_club.pricelist_walkin"),
            4999.0)

    def test_opening_stock(self):
        balls = self.env.ref("champions_club.prod_balls")
        self.assertEqual(balls.qty_available, 60)
