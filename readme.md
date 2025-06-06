# AmmA E-Commerce (Monorepo)


### Contents

1. **frontend/**  
   - A Create-React-App (or plain React) project that fetches products & images from:
     - Supabase (for data)
     - Cloudflare R2 (for images)
     - Our Express backend (hosted on Render) for endpoints under `/api`
   - Uses environment variables in `.env.local`.

2. **backend/**  
   - `app.js` contains all Express routes:
     - `/api/products`  
     - `/api/products/:baseSerial`  
     - `/api/auth/register`, `/api/auth/login`, `/api/auth/callback`  
     - `/api/cart`, `/api/cart/:cartId`  
     - `/api/like`, `/api/like/:userId`  
     - `/api/reviews/:versionId`, `/api/reviews`  
     - `/api/upload`  
   - Splits each route into `routes/*.js` for clarity.
   - Uses Supabase Admin client (service_role key) and AWS-SDK (S3) to talk to R2.

3. **supabase/**  
   - `schema.sql` defines all tables (`products`, `product_versions`, `carts`, `likes`, `reviews`).  
   - `migrations/001_create_tables.sql` has the raw `CREATE TABLE` statements.  
   - `migrations/002_rls_policies.sql` has all the Row-Level Security enabling + policy definitions.

4. **Environment Variables**  
   - **frontend** (`.env.local`):  
     ```
     NEXT_PUBLIC_SUPABASE_URL= <YOUR_SUPABASE_URL>
     NEXT_PUBLIC_SUPABASE_ANON_KEY= <YOUR_SUPABASE_ANON_KEY>
     NEXT_PUBLIC_API_BASE_URL= https://<YOUR_RENDER_APP>.onrender.com/api
     R2_PUBLIC_URL= https://<YOUR_ACCOUNT_ID>.r2.cloudflarestorage.com/<BUCKET_NAME>
     ```
   - **backend** (`backend/.env`):  
     ```
     SUPABASE_URL= <YOUR_SUPABASE_URL>
     SUPABASE_SERVICE_ROLE_KEY= <YOUR_SUPABASE_SERVICE_ROLE_KEY>
     CLOUDFLARE_ACCOUNT_ID= <YOUR_CLOUDFLARE_ACCOUNT_ID>
     R2_BUCKET= amma-product-images
     R2_ACCESS_KEY_ID= <YOUR_R2_ACCESS_KEY_ID>
     R2_SECRET_ACCESS_KEY= <YOUR_R2_SECRET_ACCESS_KEY>
     PORT= 5000
     ```

5. **Deployment**  
   - **Backend** → Render (point to `/backend`, Node 18+, start with `npm start`)  
   - **Frontend** → Vercel (point to `/frontend`, build = `npm run build`, out = `build/`)  

---

## 2. `supabase/` Folder

This folder holds all schema definitions and RLS policies so you can version-control your database setup.

### 2.1 `supabase/schema.sql`
```sql
-- --------------------------------------------------------------------------------
-- Dump of all tables and policies for AmmA E-Commerce
-- --------------------------------------------------------
-- PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id              SERIAL PRIMARY KEY,
  baseSerial      TEXT NOT NULL UNIQUE,
  category        TEXT NOT NULL,
  subCategory     TEXT NOT NULL,
  dateAdded       DATE NOT NULL DEFAULT NOW(),
  inStock         BOOLEAN NOT NULL DEFAULT true
);

-- PRODUCT_VERSIONS TABLE
CREATE TABLE IF NOT EXISTS product_versions (
  id               SERIAL PRIMARY KEY,
  product_id       INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  versionSerial    TEXT NOT NULL,
  title            TEXT NOT NULL,
  priceValue       INTEGER NOT NULL,
  description      TEXT,
  sizes            TEXT[] NOT NULL,
  imageKey         TEXT NOT NULL,
  material         TEXT,
  weight           TEXT,
  dateAdded        DATE NOT NULL DEFAULT NOW(),
  inStock          BOOLEAN NOT NULL DEFAULT true
);

-- CARTS TABLE
CREATE TABLE IF NOT EXISTS carts (
  id                  SERIAL PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id),
  product_version_id  INTEGER NOT NULL REFERENCES product_versions(id) ON DELETE CASCADE,
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  size                TEXT NOT NULL,
  added_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LIKES TABLE
CREATE TABLE IF NOT EXISTS likes (
  id                  SERIAL PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id),
  product_version_id  INTEGER NOT NULL REFERENCES product_versions(id) ON DELETE CASCADE,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_version_id)
);

-- REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id                  SERIAL PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id),
  product_version_id  INTEGER NOT NULL REFERENCES product_versions(id) ON DELETE CASCADE,
  rating              INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment             TEXT,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
