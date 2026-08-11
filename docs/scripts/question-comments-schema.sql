CREATE TABLE IF NOT EXISTS question_comments (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  lawyer_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS question_comments_issue_created_at
  ON question_comments (issue_id, created_at DESC);

CREATE TABLE IF NOT EXISTS comment_submission_attempts (
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS comment_submission_attempts_ip_created_at
  ON comment_submission_attempts (ip_hash, created_at DESC);
