from datetime import datetime, time, timedelta

from odoo import api, fields, models
from odoo.exceptions import ValidationError

OPEN_HOUR = 6.0    # courts open 06:00
CLOSE_HOUR = 22.0  # last session starts 21:00, ends 22:00
DURATION = 1.0     # every session is exactly 1 hour
MAX_PER_DAY = 2


class ClubBooking(models.Model):
    _name = "club.booking"
    _description = "Champions Club Court Booking"
    _order = "date desc, start_time, id"

    court_id = fields.Many2one("club.court", required=True, ondelete="restrict")
    partner_id = fields.Many2one(
        "res.partner", string="Member", ondelete="restrict",
        help="Empty for a walk-in booking.",
    )
    walkin_name = fields.Char(string="Walk-in name")
    partner_ids = fields.Many2many(
        "res.partner", string="Social play members",
        help="Friday Social Play only: many members share one court.",
    )
    date = fields.Date(required=True, default=fields.Date.today)
    start_time = fields.Float(
        string="Start (24h)", required=True,
        help="Hour as a float on the 30-minute grid, e.g. 18.5 = 18:30.",
    )
    booking_type = fields.Selection(
        [("regular", "Regular"), ("trial", "Trial"),
         ("friday_social", "Friday Social Play")],
        required=True, default="regular",
    )
    state = fields.Selection(
        [("booked", "Booked"), ("cancelled", "Cancelled"), ("done", "Done")],
        required=True, default="booked",
    )
    price = fields.Monetary(compute="_compute_price", store=True)
    currency_id = fields.Many2one(
        "res.currency", default=lambda self: self.env.company.currency_id
    )
    start_datetime = fields.Datetime(compute="_compute_datetimes", store=True)
    stop_datetime = fields.Datetime(compute="_compute_datetimes", store=True)

    @api.depends("date", "start_time")
    def _compute_datetimes(self):
        for booking in self:
            if booking.date:
                start = datetime.combine(
                    booking.date, time.min) + timedelta(hours=booking.start_time)
                booking.start_datetime = start
                booking.stop_datetime = start + timedelta(hours=DURATION)
            else:
                booking.start_datetime = False
                booking.stop_datetime = False

    @api.depends("court_id", "partner_id", "partner_id.club_plan_id",
                 "partner_id.membership_state", "booking_type")
    def _compute_price(self):
        for booking in self:
            if booking.booking_type == "trial":
                booking.price = 0.0
            elif booking.partner_id and booking.partner_id.is_member:
                booking.price = booking.partner_id.club_plan_id.court_price
            else:
                booking.price = booking.court_id.walkin_price

    @api.constrains("start_time")
    def _check_grid_and_hours(self):
        for booking in self:
            if (booking.start_time * 2) % 1 != 0:
                raise ValidationError(
                    "Sessions start on the 30-minute grid (e.g. 18:00 or 18:30).")
            if not OPEN_HOUR <= booking.start_time <= CLOSE_HOUR - DURATION:
                raise ValidationError(
                    "Courts run 06:00-22:00 and sessions are 1 hour, "
                    "so the last start is 21:00.")

    @api.constrains("court_id", "date", "start_time", "state", "booking_type")
    def _check_no_overlap(self):
        for booking in self:
            if booking.state != "booked":
                continue
            clash = self.search_count([
                ("id", "!=", booking.id),
                ("court_id", "=", booking.court_id.id),
                ("date", "=", booking.date),
                ("state", "=", "booked"),
                ("start_time", "<", booking.start_time + DURATION),
                ("start_time", ">", booking.start_time - DURATION),
            ])
            if clash:
                raise ValidationError(
                    "That court is already booked at that time. "
                    "No double-booking, ever.")

    @api.constrains("partner_id", "date", "state", "booking_type")
    def _check_member_rules(self):
        for booking in self:
            if booking.state != "booked" or not booking.partner_id:
                continue
            if booking.partner_id.membership_state == "expired":
                raise ValidationError(
                    "This membership has expired. Renew it before booking.")
            if booking.booking_type == "friday_social":
                continue  # shared event, does not eat a member's daily quota
            count = self.search_count([
                ("id", "!=", booking.id),
                ("partner_id", "=", booking.partner_id.id),
                ("date", "=", booking.date),
                ("state", "=", "booked"),
                ("booking_type", "!=", "friday_social"),
            ])
            if count >= MAX_PER_DAY:
                raise ValidationError(
                    "Members can book at most 2 sessions per day.")

    @api.constrains("booking_type", "partner_id", "partner_ids", "walkin_name")
    def _check_who(self):
        for booking in self:
            if booking.booking_type == "friday_social":
                if not booking.partner_ids:
                    raise ValidationError(
                        "Friday Social Play needs at least one member.")
            elif not booking.partner_id and not booking.walkin_name:
                raise ValidationError(
                    "A booking needs a member or a walk-in name.")

    def action_cancel(self):
        self.write({"state": "cancelled"})

    def action_done(self):
        self.write({"state": "done"})
