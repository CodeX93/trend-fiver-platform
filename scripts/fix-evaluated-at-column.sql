-- Add the missing evaluated_at column to the predictions table
-- This should be run on the production database

DO $$ 
BEGIN 
    -- Check if the column exists before adding it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'predictions' AND column_name = 'evaluated_at'
    ) THEN 
        ALTER TABLE predictions ADD COLUMN evaluated_at timestamp;
        
        -- Update existing evaluated predictions with their creation timestamp
        -- This is a reasonable default for existing data
        UPDATE predictions 
        SET evaluated_at = timestamp_created 
        WHERE status = 'evaluated' AND evaluated_at IS NULL;
        
        RAISE NOTICE 'Added evaluated_at column to predictions table';
    ELSE
        RAISE NOTICE 'evaluated_at column already exists in predictions table';
    END IF;
END $$;