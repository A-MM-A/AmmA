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
