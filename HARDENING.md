# YNJ Vend - Security Hardening

## Overview

This document outlines the security improvements made to the public-facing APIs in the YNJ Vend application.

The goal of this phase was to improve input validation, protect business logic, reduce information disclosure, and ensure only valid data is written to DynamoDB.

---

# Before vs. After

| Before                                                | After                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| ❌ API accepted almost any JSON payload                | ✅ Only expected fields are accepted                                |
| ❌ Missing fields caused server errors                 | ✅ Missing fields return **400 Bad Request**                        |
| ❌ Unlimited text input                                | ✅ Maximum field lengths enforced                                   |
| ❌ Users could submit unauthorized fields              | ✅ Unknown fields such as `status` and `isAdmin` are rejected       |
| ❌ Clients controlled important values                 | ✅ Server generates IDs, timestamps, and request status             |
| ❌ Internal AWS/Python errors were returned to clients | ✅ Internal errors are logged while users receive generic responses |
| ❌ No validation on requested quantities               | ✅ Quantities must be whole numbers between **1** and **1000**      |

---

# Request Processing

```text
                 Customer Request
                        │
                        ▼
              Amazon API Gateway
                        │
                        ▼
               AWS Lambda Function
                        │
         ┌──────────────┴──────────────┐
         │                             │
         ▼                             ▼
  Validate Request              Reject Invalid Input
         │                             │
         ▼                             ▼
 Generate Server Values        Return HTTP 400
 (UUID, Status, Timestamp)
         │
         ▼
 Write Validated Data
    to DynamoDB
         │
         ▼
 Return Success Response
```

---

# Security Controls Implemented

### Input Validation

* Required JSON request body
* Required field validation
* Validation that the payload is a JSON object
* Maximum field length enforcement
* Whitespace trimming
* Whole-number validation
* Quantity range validation (1–1000)

---

### Business Logic Protection

The backend now controls critical application values instead of trusting the client.

The server now generates:

* Customer IDs
* Request IDs
* Request timestamps
* Default request status (`New`)

This prevents clients from modifying protected application data.

---

### Unauthorized Field Protection

Requests containing unexpected fields are rejected.

Examples include:

* `status`
* `isAdmin`
* Any property not explicitly supported by the API

---

### Secure Error Handling

Internal application errors are no longer returned to API callers.

Instead:

* Detailed exceptions are written to Amazon CloudWatch Logs.
* Clients receive generic HTTP 500 responses.
* Internal implementation details remain protected.

---

### DynamoDB Protection

Customer and request creation use conditional writes to reduce the risk of accidentally overwriting existing records.

---

# Security Testing

The following tests were successfully completed.

| Test                                                 | Result    |
| ---------------------------------------------------- | --------- |
| Valid customer creation                              | ✅ Passed  |
| Missing required customer field                      | ✅ Passed  |
| Customer request containing injected `isAdmin` field | ✅ Blocked |
| Valid product request                                | ✅ Passed  |
| Product request containing injected `status` field   | ✅ Blocked |
| Python syntax validation                             | ✅ Passed  |

---

# Current Security Status

## Public Endpoints

These endpoints are intentionally public.

```text
GET  /public/inventory
POST /customers
POST /requests
```

---

## Owner Management Endpoints

These endpoints currently exist but will be protected in the next security phase.

```text
GET    /inventory
POST   /inventory
PUT    /inventory
DELETE /inventory
GET    /customers
GET    /requests
PUT    /requests
```

---

# Next Phase

The next security milestone will include:

* Amazon Cognito authentication
* JWT authorization
* Owner and customer role separation
* Protected API Gateway routes
* API throttling
* Production CORS configuration
* Additional monitoring and alerting

---

# Summary

This security hardening phase focused on strengthening the application's public APIs before building the customer-facing React portal.

The result is a more secure serverless backend that validates input, protects business logic, prevents common client-side manipulation, and provides safer error handling while maintaining the existing application architecture.
