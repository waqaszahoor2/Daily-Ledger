# 🚀 How to Fix Vercel 404 Error (Step-by-Step Guide)

If you get a **404 NOT_FOUND** error on Vercel, follow these 3 steps to fix it instantly:

---

### Step 1: Set Root Directory in Vercel

1. Open your project in [Vercel Dashboard](https://vercel.com/dashboard).
2. Go to **Settings** ⚙️ -> **General**.
3. Scroll down to **Root Directory**.
4. Click **Edit**:
   - If your project files are inside `dailyledger-app`, type `dailyledger-app` into the Root Directory box.
   - If your project files are at the root of your GitHub repository, leave it blank (`./`).
5. Click **Save**.

---

### Step 2: Set Environment Variables on Vercel

Go to **Settings** ⚙️ -> **Environment Variables** and add:

| Key | Value Example |
| :--- | :--- |
| `NEXTAUTH_SECRET` | `a_random_secure_secret_key_32_chars` |
| `NEXTAUTH_URL` | `https://your-app-name.vercel.app` |

---

### Step 3: Trigger a Redeploy

1. Go to the **Deployments** tab on Vercel.
2. Click the three dots `...` next to your latest deployment.
3. Click **Redeploy** (make sure "Use existing Build Cache" is unchecked if you updated Root Directory).

---

### Verification
Once redeployed, test all routes:
- Home: `https://your-app-name.vercel.app/`
- Login: `https://your-app-name.vercel.app/login`
- Dashboard: `https://your-app-name.vercel.app/dashboard`
- Debts: `https://your-app-name.vercel.app/dashboard/debts`
- Transactions: `https://your-app-name.vercel.app/dashboard/transactions`
- Reports: `https://your-app-name.vercel.app/dashboard/reports`
- Settings: `https://your-app-name.vercel.app/dashboard/settings`
