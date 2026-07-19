import importlib.util
import unittest
from datetime import timedelta
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "hourly_notify.py"
SPEC = importlib.util.spec_from_file_location("hourly_notify", MODULE_PATH)
hourly_notify = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(hourly_notify)


def event_payload(**overrides):
    payload = {
        "date": "2026-07-19",
        "start_time_local": "21:00",
        "timezone": "UTC+3",
        "track_code": "monza",
        "track_name": "Monza",
        "event_type": "hourly",
        "race_format": "hourly",
        "competition_mode": "standalone",
        "points_multiplier": 5.0,
        "race_duration_minutes": 60,
        "registrations": 24,
        "weather": {"rain_level": 0.05},
        "game_time": {"code": "day", "label_ru": "День", "label": "Day", "hour_of_day": 18},
        "server": {"name": "ASG Racing 1H Race", "password": "ghbdtn"},
        "details_url": "/hourly/",
    }
    payload.update(overrides)
    return payload


class NotificationTemplateTests(unittest.TestCase):
    def test_hourly_caption_keeps_existing_details_and_adds_compact_fields(self):
        caption = hourly_notify.build_photo_caption(event_payload(), "18_msk", timedelta(hours=3))

        for expected in (
            "В 5 раз больше очков!",
            "Трасса:</b> Monza",
            "Дата:</b> 19.07.2026",
            "Старт:</b> 21:00 UTC+3",
            "Гонка:</b> 60 мин",
            "Правила пит-стопов:</b> смотрите на сайте",
            "Погода:",
            "Игровое время:",
            "Участников:</b> 24",
            "Сервер:</b>",
            "Пароль:</b>",
        ):
            self.assertIn(expected, caption)

    def test_endurance_uses_event_multiplier_and_duration(self):
        payload = event_payload(
            event_type="endurance",
            race_format="endurance",
            points_multiplier=10.0,
            race_duration_minutes=120,
        )
        caption = hourly_notify.build_photo_caption(payload, "12_msk", timedelta(hours=3))

        self.assertIn("В 10 раз больше очков!", caption)
        self.assertIn("гонки Endurance", caption)
        self.assertIn("Гонка:</b> 120 мин", caption)

    def test_championship_keeps_championship_scoring_copy(self):
        payload = event_payload(
            event_type="championship",
            competition_mode="championship",
            championship_title="ASG Racing July 2026",
            points_multiplier=1.0,
        )
        caption = hourly_notify.build_photo_caption(payload, "18_msk", timedelta(hours=3))

        self.assertIn("ГОНКА ЧЕМПИОНАТА — ASG Racing July 2026!", caption)
        self.assertNotIn("раз больше очков", caption)
        self.assertIn("Правила пит-стопов:</b> смотрите на сайте", caption)

    def test_discord_contains_compact_duration_and_rules(self):
        payload = event_payload(
            event_type="endurance",
            race_format="endurance",
            points_multiplier=10.0,
            race_duration_minutes=120,
        )
        message = hourly_notify.build_discord_payload(payload, "18_msk", timedelta(hours=3))
        embed = message["embeds"][0]
        fields = {field["name"]: field["value"] for field in embed["fields"]}

        self.assertIn("X10 POINTS", embed["description"])
        self.assertEqual(fields["Race duration"], "120 minutes")
        self.assertEqual(fields["Pit-stop rules"], "See the event page")
        self.assertIn("Endurance alert", message["content"])


if __name__ == "__main__":
    unittest.main()
