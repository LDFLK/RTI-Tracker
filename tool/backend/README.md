# Backend Setup Guide

This guide provides the necessary steps to set up the local development environment, seed the database, and authenticate with the Asgardeo identity provider.

## 1. Database Configuration & Seeding

Before running the application, you must initialize the database schema and populate it with initial data.

> **Note:** Please refer to the instructions in `sql/README.md` for specific SQL scripts and database configuration details.

## 2. Running the Application

Once the database is seeded and the PostgreSQL instance is active, you can start the FastAPI server.

We use `uv` for dependency management. The following command will automatically create a virtual environment, install all dependencies listed in `pyproject.toml`, and start the development server:

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

After the server starts, you can access the following local endpoints:
- **Local API:** [http://localhost:8000](http://localhost:8000)
- **API Documentation (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)

## 3. Authentication & Authorization

The API uses Asgardeo for OAuth2 authentication. You will need an access token to interact with protected endpoints.

### A. Generate Client Credentials

To retrieve an `access_token`, you first need a Base64 encoded string of your client credentials (`client_id:client_secret`) for the `Authorization: Basic` header. 

Replace `client_ID` and `client_secret` with the values provided in the Asgardeo console for your registered application, and run the following command to generate the encoded string:

```bash
echo -n "client_ID:client_secret" | base64
```

### B. Fetch Access Token

Once you have the Base64 encoded credentials, use the following `curl` request to obtain an OpenID Connect (OIDC) token. 

Make sure to replace the placeholder values in the command:
- `{org}`: Your Asgardeo organization name.
- `{base64<client_id:client_secret>}`: The Base64 string generated in the previous step.
- `{username}`: Your Asgardeo username.
- `{password}`: Your Asgardeo password.

```bash
curl --location 'https://api.asgardeo.io/t/{org}/oauth2/token' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Authorization: Basic {base64<client_id:client_secret>}' \
--data-urlencode 'grant_type=password' \
--data-urlencode 'username={username}' \
--data-urlencode 'password={password}' \
--data-urlencode 'scope=openid email groups'
```

### C. Using the Access Token

A successful response will return a JSON payload containing your authentication tokens:

```json
{
  "access_token": "eyJhbGciOiJSUzI...",
  "scope": "openid email groups",
  "id_token": "eyJhbGciOiJSUzI..."
}
```

Extract the `access_token` from this response. You must include it as a **Bearer token** in the `Authorization` header when making requests to protected API endpoints:

```http
Authorization: Bearer <your_access_token>
```