-- Migration 001: Create all tables for AmmA E-Commerce

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id              SERIAL PRIMARY KEY,
  baseSerial      TEXT NOT NULL UNIQUE,
  category        TEXT NOT NULL,
  subCategory     TEXT NOT NULL,
  dateAdded       DATE NOT NULL DEFAULT NOW(),
  inStock         BOOLEAN NOT NULL DEFAULT true
);

-- PRODUCT_VERSIONS
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

-- CARTS
CREATE TABLE IF NOT EXISTS carts (
  id                  SERIAL PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id),
  product_version_id  INTEGER NOT NULL REFERENCES product_versions(id) ON DELETE CASCADE,
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  size                TEXT NOT NULL,
  added_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LIKES
CREATE TABLE IF NOT EXISTS likes (
  id                  SERIAL PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id),
  product_version_id  INTEGER NOT NULL REFERENCES product_versions(id) ON DELETE CASCADE,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_version_id)
);

-- REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id                  SERIAL PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id),
  product_version_id  INTEGER NOT NULL REFERENCES product_versions(id) ON DELETE CASCADE,
  rating              INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment             TEXT,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);



-- PRODUCTS: Public can SELECT
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read_products
  ON products
  FOR SELECT
  USING (true);




-- PRODUCT_VERSIONS: Public can SELECT
ALTER TABLE product_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read_versions
  ON product_versions
  FOR SELECT
  USING (true);



--  only the owner can read/insert/delete
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
-- Allow users to SELECT only their own carts:
CREATE POLICY select_own_cart
  ON carts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to INSERT only for themselves:
CREATE POLICY insert_own_cart
  ON carts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to DELETE only their own cart items:
CREATE POLICY delete_own_cart
  ON carts
  FOR DELETE
  USING (auth.uid() = user_id);




--  only the owner can read/insert/delete
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_likes
  ON likes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY insert_own_likes
  ON likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY delete_own_likes
  ON likes
  FOR DELETE
  USING (auth.uid() = user_id);



--  public can read/insert/delete

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
-- Any visitor (even unauthenticated) can read reviews:
CREATE POLICY select_public_reviews
  ON reviews
  FOR SELECT
  USING (true);

-- Only a logged-in user can insert their own review:
CREATE POLICY insert_own_reviews
  ON reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
