    -- ============================================
    -- HR APP - Supabase Migration Script
    -- Run this in Supabase SQL Editor
    -- ============================================

    -- Step 1: Enable pgvector extension
    CREATE EXTENSION IF NOT EXISTS vector;

    -- Step 2: Create ENUM types
    DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
            CREATE TYPE userrole AS ENUM ('admin', 'recruiter');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'candidatestatus') THEN
            CREATE TYPE candidatestatus AS ENUM (
                'new', 'screening', 'interview', 
                'offer', 'hired', 'rejected', 'withdrawn'
            );
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'jobtype') THEN
            CREATE TYPE jobtype AS ENUM (
                'full_time', 'part_time', 'contract', 
                'internship', 'temporary'
            );
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experiencelevel') THEN
            CREATE TYPE experiencelevel AS ENUM (
                'entry', 'junior', 'mid', 
                'senior', 'lead', 'executive'
            );
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'jobstatus') THEN
            CREATE TYPE jobstatus AS ENUM (
                'draft', 'open', 'paused', 
                'closed', 'filled'
            );
        END IF;
    END $$;

    -- ============================================
    -- Step 3: Create Users table
    -- ============================================
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        hashed_password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role userrole NOT NULL DEFAULT 'recruiter',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);

    -- ============================================
    -- Step 4: Create Candidates table
    -- ============================================
    CREATE TABLE IF NOT EXISTS candidates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        current_title VARCHAR(200),
        current_company VARCHAR(200),
        years_of_experience INTEGER,
        skills VARCHAR[],
        resume_text TEXT,
        resume_url VARCHAR(500),
        location VARCHAR(200),
        status candidatestatus NOT NULL DEFAULT 'new',
        linkedin_url VARCHAR(500),
        notes TEXT,
        embedding VECTOR(768),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS ix_candidates_email ON candidates (email);

    -- ============================================
    -- Step 5: Create Jobs table
    -- ============================================
    CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        department VARCHAR(100),
        team VARCHAR(100),
        job_type jobtype NOT NULL DEFAULT 'full_time',
        experience_level experiencelevel NOT NULL DEFAULT 'mid',
        location VARCHAR(200),
        is_remote BOOLEAN NOT NULL DEFAULT false,
        required_skills VARCHAR[],
        preferred_skills VARCHAR[],
        min_years_experience INTEGER,
        education_requirement VARCHAR(200),
        salary_min NUMERIC(12,2),
        salary_max NUMERIC(12,2),
        salary_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        benefits VARCHAR[],
        responsibilities VARCHAR[],
        status jobstatus NOT NULL DEFAULT 'draft',
        posted_at TIMESTAMP WITH TIME ZONE,
        closes_at TIMESTAMP WITH TIME ZONE,
        deleted_at TIMESTAMP WITH TIME ZONE,
        embedding VECTOR(768),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS ix_jobs_title ON jobs (title);

    -- ============================================
    -- Step 6: Create Match Results table
    -- ============================================
    CREATE TABLE IF NOT EXISTS match_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        overall_score NUMERIC(3,2) NOT NULL,
        skills_score NUMERIC(3,2) NOT NULL,
        experience_score NUMERIC(3,2) NOT NULL,
        reasoning TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    -- ============================================
    -- Step 7: Create updated_at trigger function
    -- (Auto-updates updated_at on every row change)
    -- ============================================
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = now();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Apply trigger to all tables
    CREATE OR REPLACE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE OR REPLACE TRIGGER update_candidates_updated_at
        BEFORE UPDATE ON candidates
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE OR REPLACE TRIGGER update_jobs_updated_at
        BEFORE UPDATE ON jobs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE OR REPLACE TRIGGER update_match_results_updated_at
        BEFORE UPDATE ON match_results
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- ============================================
    -- Step 8: Enable Row Level Security (RLS)
    -- (Required by Supabase for frontend access)
    -- ============================================

    -- Enable RLS on all tables
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
    ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

    -- Allow authenticated users to read all data
    CREATE POLICY "Allow authenticated read access on users"
        ON users FOR SELECT
        TO authenticated
        USING (true);

    CREATE POLICY "Allow authenticated read access on candidates"
        ON candidates FOR SELECT
        TO authenticated
        USING (true);

    CREATE POLICY "Allow authenticated full access on candidates"
        ON candidates FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);

    CREATE POLICY "Allow authenticated read access on jobs"
        ON jobs FOR SELECT
        TO authenticated
        USING (true);

    CREATE POLICY "Allow authenticated full access on jobs"
        ON jobs FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);

    CREATE POLICY "Allow authenticated read access on match_results"
        ON match_results FOR SELECT
        TO authenticated
        USING (true);

    CREATE POLICY "Allow authenticated full access on match_results"
        ON match_results FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);

    -- Allow anon (public) read access to jobs (for job listing page)
    CREATE POLICY "Allow public read access on jobs"
        ON jobs FOR SELECT
        TO anon
        USING (status = 'open' AND deleted_at IS NULL);

    -- ============================================
    -- Step 9: Insert sample data (optional)
    -- ============================================

    -- Sample admin user (password: StrongPass123!)
    -- bcrypt hash of "StrongPass123!"
    INSERT INTO users (email, hashed_password, full_name, role, is_active)
    VALUES (
        'admin@hrapp.com',
        '$2b$12$LJ3m4ysRXKLjP0pY5X7TZeKR8nHqGPBvFxST5v0VxWz7YqK8Q2Ymu',
        'Admin User',
        'admin',
        true
    ) ON CONFLICT (email) DO NOTHING;

    -- Sample jobs
    INSERT INTO jobs (title, description, department, job_type, experience_level, location, is_remote, required_skills, status)
    VALUES 
    (
        'Senior Java Developer',
        'We are looking for an experienced Java developer to join our backend team. Must have 5+ years of experience with Spring Boot and microservices architecture.',
        'Engineering',
        'full_time',
        'senior',
        'Remote',
        true,
        ARRAY['java', 'spring boot', 'postgresql', 'docker'],
        'open'
    ),
    (
        'Python Backend Engineer',
        'Looking for a Python developer with FastAPI and cloud experience. Will work on our AI-powered HR platform.',
        'Engineering',
        'full_time',
        'mid',
        'New York, NY',
        false,
        ARRAY['python', 'fastapi', 'aws', 'postgresql'],
        'open'
    ),
    (
        'Frontend React Developer',
        'Join our frontend team to build beautiful and responsive user interfaces using React and TypeScript.',
        'Engineering',
        'full_time',
        'mid',
        'San Francisco, CA',
        true,
        ARRAY['react', 'typescript', 'tailwind css', 'next.js'],
        'open'
    )
    ON CONFLICT DO NOTHING;

    -- Sample candidates
    INSERT INTO candidates (first_name, last_name, email, phone, current_title, current_company, years_of_experience, skills, location, status)
    VALUES
    (
        'John',
        'Doe',
        'john.doe@example.com',
        '+1234567890',
        'Senior Software Engineer',
        'Tech Corp',
        8,
        ARRAY['python', 'fastapi', 'postgresql', 'docker', 'kubernetes'],
        'San Francisco, CA',
        'new'
    ),
    (
        'Jane',
        'Smith',
        'jane.smith@example.com',
        '+1987654321',
        'Full Stack Developer',
        'StartupXYZ',
        5,
        ARRAY['react', 'typescript', 'node.js', 'postgresql', 'aws'],
        'New York, NY',
        'new'
    ),
    (
        'Bob',
        'Johnson',
        'bob.johnson@example.com',
        '+1122334455',
        'Java Developer',
        'Enterprise Inc',
        6,
        ARRAY['java', 'spring boot', 'microservices', 'docker', 'kafka'],
        'Chicago, IL',
        'screening'
    )
    ON CONFLICT (email) DO NOTHING;

    -- ============================================
    -- DONE! Your database is ready.
    -- ============================================

    -- Verify tables were created:
    -- SELECT table_name FROM information_schema.tables 
    -- WHERE table_schema = 'public' ORDER BY table_name;