from datetime import timedelta

from odoo import fields
from odoo.exceptions import ValidationError
from odoo.tests.common import TransactionCase


class TestBooking(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.court = cls.env.ref("champions_club.court_tennis_1")
        cls.plan = cls.env.ref("champions_club.plan_silver")
        cls.member = cls.env["res.partner"].create({
            "name": "Silver Member", "club_plan_id": cls.plan.id,
            "membership_expiry": fields.Date.today() + timedelta(days=90),
        })
        cls.day = fields.Date.today() + timedelta(days=1)

    def _book(self, **kw):
        vals = {"court_id": self.court.id, "date": self.day, "start_time": 18.0}
        vals.update(kw)
        return self.env["club.booking"].create(vals)

    def test_member_price_from_plan(self):
        booking = self._book(partner_id=self.member.id)
        self.assertEqual(booking.price, 300.0)

    def test_walkin_price_from_court(self):
        booking = self._book(walkin_name="Guest")
        self.assertEqual(booking.price, 500.0)

    def test_double_booking_blocked(self):
        self._book(partner_id=self.member.id)
        with self.assertRaises(ValidationError):
            self._book(walkin_name="Other", start_time=18.5)

    def test_back_to_back_allowed(self):
        self._book(partner_id=self.member.id)
        self._book(walkin_name="Next", start_time=19.0)

    def test_off_grid_blocked(self):
        with self.assertRaises(ValidationError):
            self._book(partner_id=self.member.id, start_time=18.25)

    def test_third_booking_blocked(self):
        self._book(partner_id=self.member.id, start_time=10.0)
        self._book(partner_id=self.member.id, start_time=12.0)
        with self.assertRaises(ValidationError):
            self._book(partner_id=self.member.id, start_time=14.0)

    def test_expired_member_blocked(self):
        expired = self.env["res.partner"].create({
            "name": "Expired", "club_plan_id": self.plan.id,
            "membership_expiry": fields.Date.today() - timedelta(days=1),
        })
        with self.assertRaises(ValidationError):
            self._book(partner_id=expired.id)

    def test_cancel_frees_the_slot(self):
        booking = self._book(partner_id=self.member.id)
        booking.action_cancel()
        self._book(walkin_name="Replacement")

    def test_social_play_many_members(self):
        other = self.env["res.partner"].create({
            "name": "Friend", "club_plan_id": self.plan.id,
            "membership_expiry": fields.Date.today() + timedelta(days=90),
        })
        booking = self._book(
            booking_type="friday_social",
            partner_ids=[(6, 0, [self.member.id, other.id])],
        )
        self.assertEqual(len(booking.partner_ids), 2)
