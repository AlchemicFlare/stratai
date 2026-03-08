-- =============================================================================
-- stratAI Core Platform — PostgreSQL Database Schema
-- Database: pgdb (DigitalOcean Managed PostgreSQL)
-- Version: 1.0
-- Date: 2026-03-08
--
-- This schema implements the data model for the stratAI drill core annotation
-- platform. It supports multi-tenancy, geospatial data (PostGIS), vector
-- embeddings (pgvector), and a complete audit trail for JORC/NI 43-101.
--
-- Run against the 'pgdb' database attached to the stratai DO App.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgvector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ORGANIZATIONS & USERS (Multi-Tenancy)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    tier            VARCHAR(50)  NOT NULL DEFAULT 'starter'
                    CHECK (tier IN ('starter','professional','enterprise')),
    max_users       INT          NOT NULL DEFAULT 5,
    max_storage_gb  INT          NOT NULL DEFAULT 50,
    api_enabled     BOOLEAN      NOT NULL DEFAULT FALSE,
    settings        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(50)  NOT NULL DEFAULT 'geologist'
                    CHECK (role IN ('admin','geologist','viewer','ai_trainer')),
    avatar_url      TEXT,
    preferences     JSONB        NOT NULL DEFAULT '{}',
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email_trgm ON users USING gin(email gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PROJECTS (Drilling Programs)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    project_code    VARCHAR(50)  NOT NULL,
    location_name   VARCHAR(255),
    location_point  GEOMETRY(Point, 4326),          -- WGS84 centre point
    target_commodity VARCHAR(100),                   -- Gold, Copper, Lithium …
    coordinate_system VARCHAR(50) NOT NULL DEFAULT 'EPSG:4326',
    status          VARCHAR(50)  NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','completed','archived')),
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_by      UUID         REFERENCES users(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, project_code)
);

CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_location ON projects USING GIST(location_point);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. DRILL HOLES (Collar + Survey)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE drill_holes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    hole_id         VARCHAR(100) NOT NULL,           -- e.g. "IKDD-23-001"
    collar_location GEOMETRY(PointZ, 4326),          -- 3D point with elevation
    collar_x        DOUBLE PRECISION,
    collar_y        DOUBLE PRECISION,
    collar_z        DOUBLE PRECISION,                -- Elevation / RL
    azimuth         DOUBLE PRECISION CHECK (azimuth >= 0 AND azimuth <= 360),
    dip             DOUBLE PRECISION CHECK (dip >= -90 AND dip <= 90),
    end_depth       DOUBLE PRECISION,                -- Total depth (m)
    drilled_date    DATE,
    drilling_company VARCHAR(255),
    drill_type      VARCHAR(50)
                    CHECK (drill_type IN ('diamond','RC','RAB','air_core','percussion')),
    core_diameter_mm DOUBLE PRECISION,               -- e.g. NQ = 47.6
    status          VARCHAR(50)  NOT NULL DEFAULT 'logging'
                    CHECK (status IN ('logging','complete','qc_review','archived')),
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, hole_id)
);

CREATE INDEX idx_drill_holes_project ON drill_holes(project_id);
CREATE INDEX idx_drill_holes_collar ON drill_holes USING GIST(collar_location);

CREATE TABLE surveys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drill_hole_id   UUID         NOT NULL REFERENCES drill_holes(id) ON DELETE CASCADE,
    depth           DOUBLE PRECISION NOT NULL,       -- Metres downhole
    azimuth         DOUBLE PRECISION NOT NULL CHECK (azimuth >= 0 AND azimuth <= 360),
    dip             DOUBLE PRECISION NOT NULL CHECK (dip >= -90 AND dip <= 90),
    survey_method   VARCHAR(50),                     -- gyro, magnetic, multishot
    measured_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (drill_hole_id, depth)
);

CREATE INDEX idx_surveys_hole ON surveys(drill_hole_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CORE BOXES & IMAGES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE core_boxes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drill_hole_id   UUID         NOT NULL REFERENCES drill_holes(id) ON DELETE CASCADE,
    box_number      INT          NOT NULL,
    depth_from      DOUBLE PRECISION NOT NULL,
    depth_to        DOUBLE PRECISION NOT NULL,
    core_recovery   DOUBLE PRECISION,                -- 0-100 %
    rqd             DOUBLE PRECISION,                -- 0-100 %
    rqd_method      VARCHAR(50)  DEFAULT 'manual'
                    CHECK (rqd_method IN ('manual','ai_calculated','verified')),
    logged_by       UUID         REFERENCES users(id),
    logged_at       TIMESTAMPTZ,
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (drill_hole_id, box_number),
    CHECK (depth_to > depth_from)
);

CREATE INDEX idx_core_boxes_hole ON core_boxes(drill_hole_id);
CREATE INDEX idx_core_boxes_depth ON core_boxes(depth_from, depth_to);

CREATE TABLE core_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    core_box_id     UUID         NOT NULL REFERENCES core_boxes(id) ON DELETE CASCADE,
    image_type      VARCHAR(50)  NOT NULL DEFAULT 'rgb'
                    CHECK (image_type IN ('rgb','wet','dry','cut','uncut','uv','hyperspectral')),
    storage_path    TEXT         NOT NULL,            -- S3 / DO Spaces path
    file_name       VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    mime_type       VARCHAR(100),
    width_px        INT,
    height_px       INT,
    color_profile   VARCHAR(100),                    -- sRGB, AdobeRGB, raw
    calibration     JSONB,                           -- ColorChecker reference data
    captured_at     TIMESTAMPTZ,
    uploaded_by     UUID         REFERENCES users(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_core_images_box ON core_images(core_box_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ANNOTATIONS (The Heart of the Platform)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE annotations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    core_image_id   UUID         NOT NULL REFERENCES core_images(id) ON DELETE CASCADE,
    drill_hole_id   UUID         NOT NULL REFERENCES drill_holes(id) ON DELETE CASCADE,
    layer           VARCHAR(50)  NOT NULL
                    CHECK (layer IN ('lithology','structure','alteration',
                                     'mineralization','rqd','hyperspectral','custom')),
    annotation_type VARCHAR(50)  NOT NULL
                    CHECK (annotation_type IN ('point','line','polygon','interval')),
    -- Geometry (stored as GeoJSON-like structure; canvas coords + depth reference)
    geometry        JSONB        NOT NULL,
    -- Depth reference (downhole metres)
    depth_from      DOUBLE PRECISION,
    depth_to        DOUBLE PRECISION,
    -- Classification
    label           VARCHAR(255),
    rock_type       VARCHAR(100),
    color_hex       VARCHAR(7),
    munsell_code    VARCHAR(20),
    -- Structural data
    alpha_angle     DOUBLE PRECISION,
    beta_angle      DOUBLE PRECISION,
    strike          DOUBLE PRECISION,
    dip_direction   DOUBLE PRECISION,
    -- AI fields
    confidence      DOUBLE PRECISION CHECK (confidence >= 0 AND confidence <= 1),
    ai_generated    BOOLEAN      NOT NULL DEFAULT FALSE,
    ai_model_id     VARCHAR(100),
    ai_explanation  TEXT,
    -- Validation
    validation_status VARCHAR(50) NOT NULL DEFAULT 'pending'
                    CHECK (validation_status IN ('pending','approved','rejected','modified')),
    validated_by    UUID         REFERENCES users(id),
    validated_at    TIMESTAMPTZ,
    -- Notes & metadata
    notes           TEXT,
    tags            TEXT[],
    metadata        JSONB        NOT NULL DEFAULT '{}',
    -- Embedding for semantic search
    embedding       vector(768),
    -- Provenance
    created_by      UUID         NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_annotations_image ON annotations(core_image_id);
CREATE INDEX idx_annotations_hole ON annotations(drill_hole_id);
CREATE INDEX idx_annotations_layer ON annotations(layer);
CREATE INDEX idx_annotations_depth ON annotations(depth_from, depth_to);
CREATE INDEX idx_annotations_validation ON annotations(validation_status);
CREATE INDEX idx_annotations_tags ON annotations USING gin(tags);
CREATE INDEX idx_annotations_embedding ON annotations USING ivfflat(embedding vector_cosine_ops)
    WITH (lists = 100);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. LITHOLOGY INTERVALS (Structured Log Data — acQuire-Compatible)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE lithology_intervals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drill_hole_id   UUID         NOT NULL REFERENCES drill_holes(id) ON DELETE CASCADE,
    depth_from      DOUBLE PRECISION NOT NULL,
    depth_to        DOUBLE PRECISION NOT NULL,
    rock_type       VARCHAR(100) NOT NULL,
    rock_type_code  VARCHAR(20),                     -- CGI vocabulary code
    color           VARCHAR(100),
    grain_size      VARCHAR(50),                     -- fine, medium, coarse
    texture         VARCHAR(100),                    -- porphyritic, aphanitic …
    alteration_type VARCHAR(100),
    alteration_intensity VARCHAR(50),                -- weak, moderate, strong, intense
    mineralization  TEXT,
    weathering      VARCHAR(50),                     -- fresh, slight, moderate, high, complete
    confidence      DOUBLE PRECISION,
    ai_generated    BOOLEAN      NOT NULL DEFAULT FALSE,
    logged_by       UUID         REFERENCES users(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (depth_to > depth_from)
);

CREATE INDEX idx_lithology_hole ON lithology_intervals(drill_hole_id);
CREATE INDEX idx_lithology_depth ON lithology_intervals(depth_from, depth_to);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ASSAY RESULTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE assay_intervals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drill_hole_id   UUID         NOT NULL REFERENCES drill_holes(id) ON DELETE CASCADE,
    sample_id       VARCHAR(100) NOT NULL,
    depth_from      DOUBLE PRECISION NOT NULL,
    depth_to        DOUBLE PRECISION NOT NULL,
    element         VARCHAR(20)  NOT NULL,           -- Au, Cu, Ag, Pb, Zn …
    value           DOUBLE PRECISION NOT NULL,
    unit            VARCHAR(20)  NOT NULL,           -- ppm, ppb, %, g/t
    method          VARCHAR(100),                    -- fire assay, ICP-OES …
    lab_name        VARCHAR(255),
    lab_batch       VARCHAR(100),
    qaqc_type       VARCHAR(50)
                    CHECK (qaqc_type IN ('original','blank','standard','duplicate','replicate')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (depth_to > depth_from)
);

CREATE INDEX idx_assay_hole ON assay_intervals(drill_hole_id);
CREATE INDEX idx_assay_element ON assay_intervals(element);
CREATE INDEX idx_assay_depth ON assay_intervals(depth_from, depth_to);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. AI SUGGESTIONS & MODEL TRACKING
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE ai_models (
    id              VARCHAR(100) PRIMARY KEY,         -- e.g. "lithology-resnext50-v3"
    model_type      VARCHAR(50)  NOT NULL,            -- lithology, rqd, structure, mineral
    framework       VARCHAR(50),                      -- pytorch, tensorflow, onnx
    version         VARCHAR(50),
    accuracy        DOUBLE PRECISION,
    training_samples INT,
    file_path       TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_suggestions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    core_image_id   UUID         NOT NULL REFERENCES core_images(id) ON DELETE CASCADE,
    model_id        VARCHAR(100) REFERENCES ai_models(id),
    suggestion_type VARCHAR(50)  NOT NULL,            -- lithology, structure, rqd, mineral
    label           VARCHAR(255),
    description     TEXT,
    confidence      DOUBLE PRECISION NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    depth_from      DOUBLE PRECISION,
    depth_to        DOUBLE PRECISION,
    geometry        JSONB,
    status          VARCHAR(50)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','applied','dismissed','expired')),
    applied_annotation_id UUID   REFERENCES annotations(id),
    reviewed_by     UUID         REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_suggestions_image ON ai_suggestions(core_image_id);
CREATE INDEX idx_ai_suggestions_status ON ai_suggestions(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. EXPORT JOBS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE export_jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    format          VARCHAR(50)  NOT NULL
                    CHECK (format IN ('geojson','omf','csv','las','coco','jorc_pdf')),
    scope           JSONB        NOT NULL DEFAULT '{}',  -- drill_hole_ids, depth range, layers …
    status          VARCHAR(50)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','completed','failed')),
    file_path       TEXT,
    file_size_bytes BIGINT,
    error_message   TEXT,
    requested_by    UUID         NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_export_jobs_project ON export_jobs(project_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. AUDIT LOG (Immutable — JORC/NI 43-101 Compliance)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID         REFERENCES users(id),
    org_id          UUID         NOT NULL,
    action          VARCHAR(50)  NOT NULL,            -- create, update, delete, validate, export
    entity_type     VARCHAR(50)  NOT NULL,            -- annotation, lithology_interval, drill_hole …
    entity_id       UUID,
    changes         JSONB,                            -- { field: { old: …, new: … } }
    ip_address      INET,
    user_agent      TEXT,
    -- Blockchain-style provenance hash
    prev_hash       VARCHAR(64),
    entry_hash      VARCHAR(64),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_time ON audit_log(created_at DESC);

-- Auto-generate SHA-256 provenance hash on insert
CREATE OR REPLACE FUNCTION fn_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
    prev RECORD;
BEGIN
    SELECT entry_hash INTO prev FROM audit_log ORDER BY id DESC LIMIT 1;
    NEW.prev_hash := COALESCE(prev.entry_hash, '0000000000000000000000000000000000000000000000000000000000000000');
    NEW.entry_hash := encode(
        sha256(
            (NEW.prev_hash || NEW.user_id || NEW.action || NEW.entity_type
             || COALESCE(NEW.entity_id::TEXT,'') || COALESCE(NEW.changes::TEXT,'')
             || NEW.created_at::TEXT)::bytea
        ), 'hex'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_hash
    BEFORE INSERT ON audit_log
    FOR EACH ROW EXECUTE FUNCTION fn_audit_hash();

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. COLLABORATION & SYNC
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE active_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id      UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    socket_id       VARCHAR(255),
    cursor_position JSONB,                            -- { x, y, depth }
    last_activity   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_project ON active_sessions(project_id);

CREATE TABLE sync_queue (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation       VARCHAR(50)  NOT NULL
                    CHECK (operation IN ('create','update','delete')),
    entity_type     VARCHAR(50)  NOT NULL,
    entity_id       UUID,
    entity_data     JSONB        NOT NULL,
    sync_status     VARCHAR(50)  NOT NULL DEFAULT 'pending'
                    CHECK (sync_status IN ('pending','synced','conflict','failed')),
    client_timestamp TIMESTAMPTZ,
    synced_at       TIMESTAMPTZ,
    conflict_data   JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_queue_user ON sync_queue(user_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(sync_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. VIEWS (Common Queries)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE VIEW v_drill_hole_summary AS
SELECT
    dh.id,
    dh.hole_id,
    dh.project_id,
    p.name                          AS project_name,
    dh.end_depth,
    dh.status,
    dh.drilled_date,
    COUNT(DISTINCT cb.id)           AS total_boxes,
    COUNT(DISTINCT ci.id)           AS total_images,
    COUNT(DISTINCT a.id)            AS total_annotations,
    AVG(cb.rqd)                     AS avg_rqd,
    AVG(cb.core_recovery)           AS avg_recovery,
    MAX(a.updated_at)               AS last_annotation
FROM drill_holes dh
JOIN projects p ON dh.project_id = p.id
LEFT JOIN core_boxes cb ON dh.id = cb.drill_hole_id
LEFT JOIN core_images ci ON cb.id = ci.core_box_id
LEFT JOIN annotations a ON ci.id = a.core_image_id
GROUP BY dh.id, dh.hole_id, dh.project_id, p.name, dh.end_depth, dh.status, dh.drilled_date;

CREATE VIEW v_annotation_stats AS
SELECT
    u.id                            AS user_id,
    u.full_name,
    COUNT(a.id)                     AS total_annotations,
    AVG(a.confidence)               AS avg_confidence,
    COUNT(*) FILTER (WHERE a.ai_generated)             AS ai_generated_count,
    COUNT(*) FILTER (WHERE a.validation_status = 'approved') AS validated_count,
    MAX(a.created_at)               AS last_annotation
FROM users u
LEFT JOIN annotations a ON u.id = a.created_by
GROUP BY u.id, u.full_name;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. ROW-LEVEL SECURITY (Multi-Tenant Isolation)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_holes ENABLE ROW LEVEL SECURITY;

-- Users can only see projects belonging to their organization.
-- The application must SET app.current_org_id = '<uuid>' per connection.
CREATE POLICY org_isolation_projects ON projects
    USING (org_id = current_setting('app.current_org_id')::UUID);

-- Drill holes visible through their project's org
CREATE POLICY org_isolation_drill_holes ON drill_holes
    USING (project_id IN (
        SELECT id FROM projects WHERE org_id = current_setting('app.current_org_id')::UUID
    ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. UPDATED_AT AUTO-TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all mutable tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT unnest(ARRAY[
            'organizations','users','projects','drill_holes',
            'core_boxes','annotations','lithology_intervals'
        ])
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()', t
        );
    END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. SEED DATA (Demo Project — Rupert Resources Ikkari)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO organizations (id, name, slug, tier) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'stratAI Demo', 'stratai-demo', 'professional');

INSERT INTO users (id, org_id, email, password_hash, full_name, role) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'sarah.chen@stratai.io', '$2b$12$placeholder_hash', 'Sarah Chen', 'geologist'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'james.peterson@stratai.io', '$2b$12$placeholder_hash', 'James Peterson', 'geologist');

INSERT INTO projects (id, org_id, name, project_code, location_name, target_commodity, created_by) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'Rupert Resources - Ikkari Discovery', 'IKKARI-2026', 'Sodankylä, Finland', 'Gold',
     'b0000000-0000-0000-0000-000000000001');

INSERT INTO drill_holes (id, project_id, hole_id, collar_x, collar_y, collar_z, azimuth, dip, end_depth, drill_type, core_diameter_mm, status) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
     'IKDD-23-001', 27.0123, 67.4321, 210.5, 135, -60, 450.0, 'diamond', 47.6, 'logging');

INSERT INTO core_boxes (drill_hole_id, box_number, depth_from, depth_to, rqd, rqd_method, logged_by) VALUES
    ('d0000000-0000-0000-0000-000000000001', 1,  145.2, 148.0, 78, 'ai_calculated', 'b0000000-0000-0000-0000-000000000001'),
    ('d0000000-0000-0000-0000-000000000001', 2,  148.0, 150.5, 85, 'manual',        'b0000000-0000-0000-0000-000000000001'),
    ('d0000000-0000-0000-0000-000000000001', 3,  150.5, 153.2, 62, 'ai_calculated', 'b0000000-0000-0000-0000-000000000001'),
    ('d0000000-0000-0000-0000-000000000001', 4,  153.2, 155.8, 91, 'verified',       'b0000000-0000-0000-0000-000000000001');

INSERT INTO lithology_intervals (drill_hole_id, depth_from, depth_to, rock_type, grain_size, alteration_type, alteration_intensity, confidence, ai_generated, logged_by) VALUES
    ('d0000000-0000-0000-0000-000000000001', 145.2, 147.5, 'Tonalite', 'medium', NULL, NULL, 0.94, TRUE, 'b0000000-0000-0000-0000-000000000001'),
    ('d0000000-0000-0000-0000-000000000001', 147.5, 149.8, 'Tonalite', 'medium', 'chloritic', 'weak', 0.91, TRUE, 'b0000000-0000-0000-0000-000000000001'),
    ('d0000000-0000-0000-0000-000000000001', 149.8, 151.5, 'Sandstone', 'fine', 'sericitic', 'moderate', 0.87, FALSE, 'b0000000-0000-0000-0000-000000000001'),
    ('d0000000-0000-0000-0000-000000000001', 151.5, 153.2, 'Basalt', 'aphanitic', NULL, NULL, 0.92, TRUE, 'b0000000-0000-0000-0000-000000000001'),
    ('d0000000-0000-0000-0000-000000000001', 153.2, 155.8, 'Limestone', 'medium', NULL, NULL, 0.88, FALSE, 'b0000000-0000-0000-0000-000000000001');

INSERT INTO ai_models (id, model_type, framework, version, accuracy, training_samples) VALUES
    ('lithology-resnext50-v3', 'lithology', 'pytorch', '3.0.0', 0.9312, 45000),
    ('rqd-yolov8-v2',         'rqd',       'pytorch', '2.1.0', 0.9580, 12000),
    ('structure-detr-v1',      'structure',  'pytorch', '1.0.0', 0.8800, 8000);

-- ─────────────────────────────────────────────────────────────────────────────
-- SCHEMA COMPLETE
-- Run: psql -h <host> -U <user> -d pgdb -f schema.sql
-- ─────────────────────────────────────────────────────────────────────────────
