from odoo import fields, models


class ClubCourt(models.Model):
    _name = "club.court"
    _description = "Champions Club Court"
    _order = "name, id"

    name = fields.Char(required=True)
    sport = fields.Selection(
        [("tennis", "Tennis"), ("cricket", "Cricket")], required=True
    )
    walkin_price = fields.Monetary(
        string="Walk-in price / hour", required=True, default=500.0
    )
    currency_id = fields.Many2one(
        "res.currency", default=lambda self: self.env.company.currency_id
    )
    active = fields.Boolean(default=True)

    _name_unique = models.Constraint("UNIQUE(name)", "Court name must be unique.")
