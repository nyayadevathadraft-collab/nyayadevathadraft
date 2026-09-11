-- Enable Row Level Security on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_statutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_authorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Helper function: get the current user's tenant_id from their Supabase auth UID
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE supabase_id = auth.uid()::text LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Tenants: users can only see their own tenant
CREATE POLICY "tenant_self" ON tenants
  FOR ALL USING (id = get_tenant_id());

-- Users: can only see users in same tenant
CREATE POLICY "users_same_tenant" ON users
  FOR ALL USING (tenant_id = get_tenant_id());

-- Matters
CREATE POLICY "matters_tenant" ON matters
  FOR ALL USING (tenant_id = get_tenant_id());

-- Documents
CREATE POLICY "documents_tenant" ON documents
  FOR ALL USING (tenant_id = get_tenant_id());

-- Facts
CREATE POLICY "facts_tenant" ON facts
  FOR ALL USING (tenant_id = get_tenant_id());

-- Legal issues
CREATE POLICY "legal_issues_tenant" ON legal_issues
  FOR ALL USING (tenant_id = get_tenant_id());

-- Matter statutes (via matter's tenant)
CREATE POLICY "matter_statutes_tenant" ON matter_statutes
  FOR ALL USING (
    matter_id IN (SELECT id FROM matters WHERE tenant_id = get_tenant_id())
  );

-- Matter authorities
CREATE POLICY "matter_authorities_tenant" ON matter_authorities
  FOR ALL USING (
    matter_id IN (SELECT id FROM matters WHERE tenant_id = get_tenant_id())
  );

-- Drafts
CREATE POLICY "drafts_tenant" ON drafts
  FOR ALL USING (tenant_id = get_tenant_id());

-- Citations (via draft's tenant)
CREATE POLICY "citations_tenant" ON citations
  FOR ALL USING (
    draft_id IN (SELECT id FROM drafts WHERE tenant_id = get_tenant_id())
  );

-- Audit events
CREATE POLICY "audit_events_tenant" ON audit_events
  FOR ALL USING (tenant_id = get_tenant_id());

-- Service role bypass (used by Inngest workers / server actions with service key)
-- All policies above use auth.uid(); server-side service role bypasses RLS automatically.
