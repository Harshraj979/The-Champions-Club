from odoo import fields, models


class ClubPlan(models.Model):
    _name = "club.plan"
    _description = "Champions Club Membership Plan"
    _order = "court_price desc, id"

    name = fields.Char(required=True)
    code = fields.Selection(
        [("gold", "Gold"), ("silver", "Silver"), ("junior", "Junior")],
        required=True,
    )
    court_price = fields.Monetary(string="Court price / hour", required=True)
    shop_discount = fields.Float(string="Shop discount %", default=0.0)
    bar_discount = fields.Float(string="Bar discount %", default=0.0)
    validity_days = fields.Integer(default=365)
    currency_id = fields.Many2one(
        "res.currency", default=lambda self: self.env.company.currency_id
    )
    active = fields.Boolean(default=True)

    _code_unique = models.Constraint("UNIQUE(code)", "Plan code must be unique.")
    _discount_range = models.Constraint(
        "CHECK(shop_discount >= 0 AND shop_discount <= 100 AND bar_discount >= 0 AND bar_discount <= 100)",
        "Discounts must be between 0 and 100%.",
    )
