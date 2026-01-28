🚀 Getting Started

Follow the steps below to run the project locally.

🔐 Cesium Ion Access Token Setup (Required)

This project uses CesiumJS, which requires a Cesium Ion access token for rendering the 3D globe.

✅ Step 1: Create a Cesium Ion Account

Go to 👉 https://cesium.com/ion/

Sign up / log in

Navigate to Access Tokens

Create a new token (default settings are sufficient)

✅ Step 2: Configure Token Locally

Inside the project directory:

📁 js/

Create a new file named:

config.js


Add the following code:

// js/config.js
export const CESIUM_TOKEN = "PASTE_YOUR_CESIUM_ION_TOKEN_HERE";
