from datetime import timedelta

from odoo import fields
from odoo.tests.common import TransactionCase


class TestMembers(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.plan = cls.env.ref("champions_club.plan_gold")

    def test_partner_without_plan_is_not_member(self):
        partner = self.env["res.partner"].create({"name": "Walk In"})
        self.assertFalse(partner.is_member)
        self.assertEqual(partner.membership_state, "none")

    def test_active_member(self):
        partner = self.env["res.partner"].create({
            "name": "Gold Member", "club_plan_id": self.plan.id,
            "membership_expiry": fields.Date.today() + timedelta(days=90),
        })
        self.assertTrue(partner.is_member)
        self.assertEqual(partner.membership_state, "active")

    def test_expired_member(self):
        partner = self.env["res.partner"].create({
            "name": "Old Member", "club_plan_id": self.plan.id,
            "membership_expiry": fields.Date.today() - timedelta(days=1),
        })
        self.assertFalse(partner.is_member)
        self.assertEqual(partner.membership_state, "expired")

    def test_expiring_member_still_member(self):
        partner = self.env["res.partner"].create({
            "name": "Soon Member", "club_plan_id": self.plan.id,
            "membership_expiry": fields.Date.today() + timedelta(days=3),
        })
        self.assertTrue(partner.is_member)
        self.assertEqual(partner.membership_state, "expiring")
