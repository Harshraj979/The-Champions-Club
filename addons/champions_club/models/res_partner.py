from datetime import timedelta

from odoo import api, fields, models


class ResPartner(models.Model):
    _inherit = "res.partner"

    club_plan_id = fields.Many2one("club.plan", string="Club plan", tracking=True)
    member_since = fields.Date()
    membership_expiry = fields.Date()
    is_member = fields.Boolean(compute="_compute_membership", store=True)
    membership_state = fields.Selection(
        [("none", "Not a member"), ("active", "Active"),
         ("expiring", "Expiring soon"), ("expired", "Expired")],
        compute="_compute_membership", store=True,
    )

    @api.depends("club_plan_id", "membership_expiry")
    def _compute_membership(self):
        today = fields.Date.today()
        for partner in self:
            if not partner.club_plan_id:
                partner.is_member = False
                partner.membership_state = "none"
            elif partner.membership_expiry and partner.membership_expiry < today:
                partner.is_member = False
                partner.membership_state = "expired"
            elif partner.membership_expiry and partner.membership_expiry <= today + timedelta(days=7):
                partner.is_member = True
                partner.membership_state = "expiring"
            else:
                partner.is_member = True
                partner.membership_state = "active"

    @api.model
    def _cron_refresh_membership_states(self):
        # Date-based computes do not rerun on their own each day; the daily
        # cron (data/cron.xml) forces a recompute so expiry is never manual.
        members = self.search([("club_plan_id", "!=", False)])
        members._compute_membership()
        expiring = members.filtered(lambda p: p.membership_state == "expiring")
        if expiring:
            self.env["mail.activity"].create([
                {
                    "res_model_id": self.env["ir.model"]._get_id("res.partner"),
                    "res_id": p.id,
                    "activity_type_id": self.env.ref("mail.mail_activity_data_todo").id,
                    "summary": "Membership expiring within 7 days - offer renewal",
                    "date_deadline": fields.Date.today(),
                }
                for p in expiring
            ])
