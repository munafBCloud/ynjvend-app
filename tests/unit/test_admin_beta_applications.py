import importlib.util
import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch


MODULE_PATH = (
    Path(__file__).resolve().parents[2]
    / "backend"
    / "admin"
    / "get_beta_applications.py"
)


def load_module():
    fake_table = MagicMock()
    fake_dynamodb = MagicMock()
    fake_dynamodb.Table.return_value = fake_table

    with patch.dict(
        os.environ,
        {
            "BETA_APPLICATIONS_TABLE": (
                "ynj-test-beta-applications"
            )
        },
    ):
        with patch("boto3.resource", return_value=fake_dynamodb):
            spec = importlib.util.spec_from_file_location(
                "get_beta_applications_admin_test",
                MODULE_PATH,
            )
            module = importlib.util.module_from_spec(spec)
            sys.modules[spec.name] = module
            spec.loader.exec_module(module)

    module.beta_applications_table = fake_table

    return module, fake_table


def event_with_groups(groups):
    return {
        "requestContext": {
            "authorizer": {
                "jwt": {
                    "claims": {
                        "sub": "test-user",
                        "cognito:groups": groups,
                    }
                }
            }
        }
    }


class AdminBetaApplicationsTests(unittest.TestCase):
    def test_platform_admin_space_separated_gateway_claim_is_allowed(self):
        module, table = load_module()

        table.scan.return_value = {
            "Items": [],
        }

        response = module.lambda_handler(
            event_with_groups("[Admins PlatformAdmins]"),
            None,
        )

        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(
            json.loads(response["body"]),
            {
                "applications": [],
                "count": 0,
            },
        )
        table.scan.assert_called_once_with()

    def test_missing_group_is_forbidden(self):
        module, table = load_module()

        response = module.lambda_handler(
            event_with_groups("Admins"),
            None,
        )

        self.assertEqual(response["statusCode"], 403)
        table.scan.assert_not_called()

    def test_missing_claims_are_forbidden(self):
        module, table = load_module()

        response = module.lambda_handler({}, None)

        self.assertEqual(response["statusCode"], 403)
        table.scan.assert_not_called()

    def test_platform_admin_string_claim_is_allowed(self):
        module, table = load_module()

        table.scan.return_value = {
            "Items": [
                {
                    "applicationId": "application-1",
                    "businessName": "Example Distributor",
                    "submittedAt": "2026-09-22T10:00:00Z",
                    "status": "submitted",
                }
            ]
        }

        response = module.lambda_handler(
            event_with_groups("[PlatformAdmins, Admins]"),
            None,
        )

        self.assertEqual(response["statusCode"], 200)

        body = json.loads(response["body"])

        self.assertEqual(body["count"], 1)
        self.assertEqual(
            body["applications"][0]["applicationId"],
            "application-1",
        )

    def test_platform_admin_list_claim_is_allowed(self):
        module, table = load_module()

        table.scan.return_value = {
            "Items": []
        }

        response = module.lambda_handler(
            event_with_groups(
                ["Admins", "PlatformAdmins"]
            ),
            None,
        )

        self.assertEqual(response["statusCode"], 200)

    def test_scan_paginates_and_sorts_newest_first(self):
        module, table = load_module()

        table.scan.side_effect = [
            {
                "Items": [
                    {
                        "applicationId": "older",
                        "submittedAt": "2026-09-20T10:00:00Z",
                    }
                ],
                "LastEvaluatedKey": {
                    "applicationId": "older"
                },
            },
            {
                "Items": [
                    {
                        "applicationId": "newer",
                        "submittedAt": "2026-09-22T10:00:00Z",
                    }
                ]
            },
        ]

        response = module.lambda_handler(
            event_with_groups("PlatformAdmins"),
            None,
        )

        self.assertEqual(response["statusCode"], 200)

        body = json.loads(response["body"])

        self.assertEqual(body["count"], 2)
        self.assertEqual(
            [
                item["applicationId"]
                for item in body["applications"]
            ],
            ["newer", "older"],
        )

        self.assertEqual(table.scan.call_count, 2)

        table.scan.assert_any_call()
        table.scan.assert_any_call(
            ExclusiveStartKey={
                "applicationId": "older"
            }
        )


if __name__ == "__main__":
    unittest.main()
