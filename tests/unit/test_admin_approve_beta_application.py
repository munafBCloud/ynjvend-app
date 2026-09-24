import importlib.util
import io
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
    / "approve_beta_application.py"
)


def load_module():
    fake_table = MagicMock()
    fake_dynamodb = MagicMock()
    fake_dynamodb.Table.return_value = fake_table

    fake_lambda = MagicMock()

    def fake_client(service_name):
        if service_name == "lambda":
            return fake_lambda
        raise AssertionError(
            f"Unexpected boto3 client: {service_name}"
        )

    with patch.dict(
        os.environ,
        {
            "BETA_APPLICATIONS_TABLE":
                "ynj-test-beta-applications",
            "PROVISIONING_FUNCTION_NAME":
                "ynj-test-provision-beta-application",
        },
    ):
        with patch(
            "boto3.resource",
            return_value=fake_dynamodb,
        ):
            with patch(
                "boto3.client",
                side_effect=fake_client,
            ):
                spec = importlib.util.spec_from_file_location(
                    "approve_beta_application_admin_test",
                    MODULE_PATH,
                )
                module = importlib.util.module_from_spec(spec)
                sys.modules[spec.name] = module
                spec.loader.exec_module(module)

    module.beta_applications_table = fake_table
    module.lambda_client = fake_lambda

    return module, fake_table, fake_lambda


def event_with_groups(
    groups,
    application_id="application-test-123",
):
    return {
        "requestContext": {
            "authorizer": {
                "jwt": {
                    "claims": {
                        "sub": "admin-test-user",
                        "cognito:groups": groups,
                    }
                }
            }
        },
        "pathParameters": {
            "applicationId": application_id,
        },
    }


def lambda_payload(value):
    return {
        "StatusCode": 200,
        "Payload": io.BytesIO(
            json.dumps(value).encode("utf-8")
        ),
    }


class AdminApproveBetaApplicationTests(unittest.TestCase):
    def test_non_platform_admin_is_forbidden(self):
        module, table, lambda_client = load_module()

        response = module.lambda_handler(
            event_with_groups("Admins"),
            None,
        )

        self.assertEqual(response["statusCode"], 403)
        table.get_item.assert_not_called()
        lambda_client.invoke.assert_not_called()

    def test_missing_application_returns_404(self):
        module, table, lambda_client = load_module()

        table.get_item.return_value = {}

        response = module.lambda_handler(
            event_with_groups(
                "[Admins PlatformAdmins]"
            ),
            None,
        )

        self.assertEqual(response["statusCode"], 404)
        lambda_client.invoke.assert_not_called()

    def test_submitted_application_is_provisioned(self):
        module, table, lambda_client = load_module()

        submitted = {
            "applicationId": "application-test-123",
            "businessName": "Example Distributor",
            "status": "submitted",
        }

        provisioned = {
            "applicationId": "application-test-123",
            "businessName": "Example Distributor",
            "status": "provisioned",
            "companyId": "company-test-123",
        }

        table.get_item.side_effect = [
            {"Item": submitted},
            {"Item": provisioned},
        ]

        lambda_client.invoke.return_value = lambda_payload(
            {
                "status": "provisioned",
                "applicationId": "application-test-123",
                "companyId": "company-test-123",
            }
        )

        response = module.lambda_handler(
            event_with_groups(
                "[Admins PlatformAdmins]"
            ),
            None,
        )

        self.assertEqual(response["statusCode"], 200)

        body = json.loads(response["body"])

        self.assertEqual(
            body["message"],
            "Application approved and provisioned.",
        )
        self.assertEqual(
            body["application"]["status"],
            "provisioned",
        )
        self.assertEqual(
            body["application"]["companyId"],
            "company-test-123",
        )

        lambda_client.invoke.assert_called_once()

        invoke_args = lambda_client.invoke.call_args.kwargs

        self.assertEqual(
            invoke_args["FunctionName"],
            "ynj-test-provision-beta-application",
        )
        self.assertEqual(
            invoke_args["InvocationType"],
            "RequestResponse",
        )

        payload = json.loads(
            invoke_args["Payload"].decode("utf-8")
        )

        self.assertEqual(
            payload,
            {
                "applicationId":
                    "application-test-123"
            },
        )

    def test_provisioning_application_can_resume(self):
        module, table, lambda_client = load_module()

        provisioning = {
            "applicationId": "application-test-123",
            "status": "provisioning",
            "companyId": "company-test-123",
        }

        provisioned = {
            "applicationId": "application-test-123",
            "status": "provisioned",
            "companyId": "company-test-123",
        }

        table.get_item.side_effect = [
            {"Item": provisioning},
            {"Item": provisioned},
        ]

        lambda_client.invoke.return_value = lambda_payload(
            {
                "status": "provisioned",
                "applicationId": "application-test-123",
                "companyId": "company-test-123",
            }
        )

        response = module.lambda_handler(
            event_with_groups(
                "[Admins PlatformAdmins]"
            ),
            None,
        )

        self.assertEqual(response["statusCode"], 200)
        lambda_client.invoke.assert_called_once()

    def test_already_provisioned_does_not_invoke_lambda(self):
        module, table, lambda_client = load_module()

        application = {
            "applicationId": "application-test-123",
            "status": "provisioned",
            "companyId": "company-test-123",
        }

        table.get_item.return_value = {
            "Item": application
        }

        response = module.lambda_handler(
            event_with_groups(
                "[Admins PlatformAdmins]"
            ),
            None,
        )

        self.assertEqual(response["statusCode"], 200)

        body = json.loads(response["body"])

        self.assertEqual(
            body["message"],
            "Application is already provisioned.",
        )

        lambda_client.invoke.assert_not_called()

    def test_invalid_status_returns_409(self):
        module, table, lambda_client = load_module()

        table.get_item.return_value = {
            "Item": {
                "applicationId": "application-test-123",
                "status": "rejected",
            }
        }

        response = module.lambda_handler(
            event_with_groups(
                "[Admins PlatformAdmins]"
            ),
            None,
        )

        self.assertEqual(response["statusCode"], 409)
        lambda_client.invoke.assert_not_called()

    def test_provisioning_failure_returns_500(self):
        module, table, lambda_client = load_module()

        table.get_item.return_value = {
            "Item": {
                "applicationId": "application-test-123",
                "status": "submitted",
            }
        }

        lambda_client.invoke.return_value = lambda_payload(
            {
                "status": "error",
                "applicationId": "application-test-123",
                "message":
                    "Unable to provision beta application.",
            }
        )

        response = module.lambda_handler(
            event_with_groups(
                "[Admins PlatformAdmins]"
            ),
            None,
        )

        self.assertEqual(response["statusCode"], 500)

    def test_lambda_function_error_returns_500(self):
        module, table, lambda_client = load_module()

        table.get_item.return_value = {
            "Item": {
                "applicationId": "application-test-123",
                "status": "submitted",
            }
        }

        response_payload = lambda_payload(
            {
                "errorMessage": "Provisioning crashed."
            }
        )
        response_payload["FunctionError"] = "Unhandled"

        lambda_client.invoke.return_value = response_payload

        response = module.lambda_handler(
            event_with_groups(
                "[Admins PlatformAdmins]"
            ),
            None,
        )

        self.assertEqual(response["statusCode"], 500)


if __name__ == "__main__":
    unittest.main()
