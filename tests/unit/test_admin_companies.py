import importlib.util
import json
import os
import sys
import unittest
from decimal import Decimal
from pathlib import Path
from unittest.mock import MagicMock, patch


MODULE_PATH = (
    Path(__file__).resolve().parents[2]
    / "backend"
    / "admin"
    / "get_companies.py"
)


def load_module():
    module_name = "get_companies_test_module"

    sys.modules.pop(module_name, None)

    mock_table = MagicMock()
    mock_dynamodb = MagicMock()
    mock_dynamodb.Table.return_value = mock_table

    with patch.dict(
        os.environ,
        {"COMPANIES_TABLE": "test-companies"},
    ):
        with patch(
            "boto3.resource",
            return_value=mock_dynamodb,
        ):
            spec = importlib.util.spec_from_file_location(
                module_name,
                MODULE_PATH,
            )
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)

    return module, mock_table


def event_with_groups(groups, path_parameters=None):
    return {
        "requestContext": {
            "authorizer": {
                "jwt": {
                    "claims": {
                        "cognito:groups": groups,
                    }
                }
            }
        },
        "pathParameters": path_parameters,
    }


class AdminCompaniesTests(unittest.TestCase):
    def setUp(self):
        self.module, self.table = load_module()

    def response_body(self, response):
        return json.loads(response["body"])

    def test_non_platform_admin_is_forbidden(self):
        response = self.module.lambda_handler(
            event_with_groups("[Admins]"),
            None,
        )

        self.assertEqual(response["statusCode"], 403)
        self.table.scan.assert_not_called()
        self.table.get_item.assert_not_called()

    def test_platform_admin_can_list_companies(self):
        self.table.scan.return_value = {
            "Items": [
                {
                    "companyId": "company-old",
                    "businessName": "Older Company",
                    "createdAt": "2026-09-01T00:00:00+00:00",
                },
                {
                    "companyId": "company-new",
                    "businessName": "Newer Company",
                    "createdAt": "2026-09-24T00:00:00+00:00",
                },
            ]
        }

        response = self.module.lambda_handler(
            event_with_groups(
                "[Admins PlatformAdmins]"
            ),
            None,
        )

        body = self.response_body(response)

        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(body["count"], 2)
        self.assertEqual(
            body["companies"][0]["companyId"],
            "company-new",
        )

    def test_platform_admin_can_get_company_detail(self):
        self.table.get_item.return_value = {
            "Item": {
                "companyId": "company-123",
                "businessName": "Example Distribution",
                "status": "active",
            }
        }

        response = self.module.lambda_handler(
            event_with_groups(
                "[Admins PlatformAdmins]",
                {"companyId": "company-123"},
            ),
            None,
        )

        body = self.response_body(response)

        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(
            body["company"]["companyId"],
            "company-123",
        )

        self.table.get_item.assert_called_once_with(
            Key={"companyId": "company-123"}
        )

    def test_missing_company_returns_404(self):
        self.table.get_item.return_value = {}

        response = self.module.lambda_handler(
            event_with_groups(
                "PlatformAdmins",
                {"companyId": "missing-company"},
            ),
            None,
        )

        self.assertEqual(response["statusCode"], 404)

    def test_blank_company_id_returns_400(self):
        response = self.module.lambda_handler(
            event_with_groups(
                "PlatformAdmins",
                {"companyId": "   "},
            ),
            None,
        )

        self.assertEqual(response["statusCode"], 400)
        self.table.get_item.assert_not_called()

    def test_list_claim_is_allowed(self):
        self.table.scan.return_value = {"Items": []}

        response = self.module.lambda_handler(
            event_with_groups(
                ["Admins", "PlatformAdmins"]
            ),
            None,
        )

        self.assertEqual(response["statusCode"], 200)

    def test_scan_pagination(self):
        self.table.scan.side_effect = [
            {
                "Items": [
                    {
                        "companyId": "company-1",
                        "createdAt": "2026-09-01",
                    }
                ],
                "LastEvaluatedKey": {
                    "companyId": "company-1"
                },
            },
            {
                "Items": [
                    {
                        "companyId": "company-2",
                        "createdAt": "2026-09-02",
                    }
                ]
            },
        ]

        response = self.module.lambda_handler(
            event_with_groups("PlatformAdmins"),
            None,
        )

        body = self.response_body(response)

        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(body["count"], 2)
        self.assertEqual(self.table.scan.call_count, 2)

        self.table.scan.assert_any_call()
        self.table.scan.assert_any_call(
            ExclusiveStartKey={
                "companyId": "company-1"
            }
        )

    def test_missing_optional_fields_are_tolerated(self):
        self.table.scan.return_value = {
            "Items": [
                {
                    "companyId": "COMPANY_TEST",
                    "status": "active",
                }
            ]
        }

        response = self.module.lambda_handler(
            event_with_groups("PlatformAdmins"),
            None,
        )

        body = self.response_body(response)

        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(body["count"], 1)
        self.assertEqual(
            body["companies"][0]["companyId"],
            "COMPANY_TEST",
        )

    def test_decimal_values_are_serialized(self):
        self.table.get_item.return_value = {
            "Item": {
                "companyId": "company-123",
                "numericValue": Decimal("2.5"),
            }
        }

        response = self.module.lambda_handler(
            event_with_groups(
                "PlatformAdmins",
                {"companyId": "company-123"},
            ),
            None,
        )

        body = self.response_body(response)

        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(
            body["company"]["numericValue"],
            2.5,
        )

    def test_dynamodb_error_returns_500(self):
        from botocore.exceptions import ClientError

        self.table.scan.side_effect = ClientError(
            {
                "Error": {
                    "Code": "InternalServerError",
                    "Message": "test",
                }
            },
            "Scan",
        )

        response = self.module.lambda_handler(
            event_with_groups("PlatformAdmins"),
            None,
        )

        self.assertEqual(response["statusCode"], 500)
        self.assertEqual(
            self.response_body(response)["message"],
            "Unable to retrieve companies.",
        )


if __name__ == "__main__":
    unittest.main()
