/*
  # Portfolio Tracker Schema

  1. New Tables
    - `portfolios`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `created_at` (timestamp)
      
    - `holdings`
      - `id` (uuid, primary key)
      - `portfolio_id` (uuid, references portfolios)
      - `symbol` (text)
      - `shares` (numeric)
      - `average_price` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create portfolios table
CREATE TABLE portfolios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL,
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Create holdings table
CREATE TABLE holdings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id uuid REFERENCES portfolios ON DELETE CASCADE NOT NULL,
    symbol text NOT NULL,
    shares numeric NOT NULL CHECK (shares > 0),
    average_price numeric NOT NULL CHECK (average_price > 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;

-- Create policies for portfolios
CREATE POLICY "Users can manage their own portfolios"
    ON portfolios
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create policies for holdings
CREATE POLICY "Users can manage holdings in their portfolios"
    ON holdings
    FOR ALL
    TO authenticated
    USING (
        portfolio_id IN (
            SELECT id FROM portfolios WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        portfolio_id IN (
            SELECT id FROM portfolios WHERE user_id = auth.uid()
        )
    );