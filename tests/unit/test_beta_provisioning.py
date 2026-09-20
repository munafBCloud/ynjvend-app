import importlib.util
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock


# The Lambda module creates boto3 resources during import, so provide the
# environment variables it expects and replace boto3 before loading it.
os.environ.setdefault("BETA_APPLICATIONS_TABLE", "test-beta-applications")
os.environ.setdefault("COMPANIES_TABLE", "test-companies")
os.environ.setdefault("COGNITO_USER_POOL_ID", "test-user-pool")


class FakeUserNotFoundException(Exception):
    pass


class FakeUsernameExistsException(Exception):
    pass


fake_boto3 = MagicMock()
fake_dynamodb = MagicMock()
fake_cognito = MagicMock()

fake_cognito.exceptions.UserNotFoundException = FakeUserNotFoundException
fake_cognito.exceptions.UsernameExistsException = FakeUsernameExistsException

fake_boto3.resource.return_value = fake_dynamodb
fake_boto3.client.return_value = fake_cognito

sys.modules["boto3"] = fake_boto3

MODULE_PATH = (
    Path(__file__).resolve().parents[2]
    / "backend"
    / "beta_applications"
    / "provision_beta_application.py"
)

spec = importlib.util.spec_from_file_location(
    "provision_beta_application",
    MODULE_PATH,
)
provisioning = importlib.util.module_from_spec(spec)
spec.loader.exec_module(provisioning)


EMAIL = "owner@example.com"
COMPANY_ID = "company-test-123"
APPLICATION_ID = "application-test-123"


def cognito_user(
    *,
    email=EMAIL,
    company_id=COMPANY_ID,
    role="owner",
    email_verified="true",
):
    attributes = [
        {"Name": "email", "Value": email},
        {"Name": "custom:companyId", "Value": company_id},
        {"Name": "custom:role", "Value": role},
    ]

    if email_verified is not None:
        attributes.append(
            {
                "Name": "email_verified",
                "Value": email_verified,
            }
        )

    return {
        "Username": email,
        "UserAttributes": attributes,
    }


class BetaProvisioningTests(unittest.TestCase):
    def setUp(self):
        provisioning.cognito.reset_mock()
        provisioning.cognito.admin_get_user.reset_mock(
            return_value=True,
            side_effect=True,
        )
        provisioning.cognito.admin_create_user.reset_mock(
            return_value=True,
            side_effect=True,
        )
        provisioning.cognito.admin_update_user_attributes.reset_mock(
            return_value=True,
            side_effect=True,
        )

    def test_new_owner_is_created_with_verified_email(self):
        created_user = cognito_user()

        provisioning.cognito.admin_get_user.side_effect = [
            FakeUserNotFoundException(),
            created_user,
        ]

        application = {
            "applicationId": APPLICATION_ID,
            "companyId": COMPANY_ID,
            "email": EMAIL,
        }

        result = provisioning.ensure_cognito_user(application)

        provisioning.cognito.admin_create_user.assert_called_once()

        kwargs = provisioning.cognito.admin_create_user.call_args.kwargs
        attributes = {
            item["Name"]: item["Value"]
            for item in kwargs["UserAttributes"]
        }

        self.assertEqual(attributes["email"], EMAIL)
        self.assertEqual(attributes["email_verified"], "true")
        self.assertEqual(attributes["custom:companyId"], COMPANY_ID)
        self.assertEqual(attributes["custom:role"], "owner")

        provisioning.cognito.admin_update_user_attributes.assert_not_called()
        self.assertEqual(result, created_user)

    def test_existing_verified_owner_requires_no_update(self):
        existing_user = cognito_user(email_verified="true")

        provisioning.cognito.admin_get_user.return_value = existing_user

        application = {
            "applicationId": APPLICATION_ID,
            "companyId": COMPANY_ID,
            "email": EMAIL,
        }

        result = provisioning.ensure_cognito_user(application)

        provisioning.cognito.admin_create_user.assert_not_called()
        provisioning.cognito.admin_update_user_attributes.assert_not_called()
        self.assertEqual(result, existing_user)

    def test_existing_unverified_owner_is_repaired(self):
        unverified_user = cognito_user(email_verified="false")
        repaired_user = cognito_user(email_verified="true")

        provisioning.cognito.admin_get_user.side_effect = [
            unverified_user,
            repaired_user,
        ]

        application = {
            "applicationId": APPLICATION_ID,
            "companyId": COMPANY_ID,
            "email": EMAIL,
        }

        result = provisioning.ensure_cognito_user(application)

        provisioning.cognito.admin_update_user_attributes.assert_called_once_with(
            UserPoolId="test-user-pool",
            Username=EMAIL,
            UserAttributes=[
                {
                    "Name": "email_verified",
                    "Value": "true",
                }
            ],
        )

        self.assertEqual(result, repaired_user)

    def test_mismatched_company_is_rejected_before_repair(self):
        conflicting_user = cognito_user(
            company_id="another-company",
            email_verified="false",
        )

        provisioning.cognito.admin_get_user.return_value = conflicting_user

        application = {
            "applicationId": APPLICATION_ID,
            "companyId": COMPANY_ID,
            "email": EMAIL,
        }

        with self.assertRaisesRegex(
            RuntimeError,
            "belongs to another company",
        ):
            provisioning.ensure_cognito_user(application)

        provisioning.cognito.admin_update_user_attributes.assert_not_called()


if __name__ == "__main__":
    unittest.main()
