import sqlite3
import os
from contextlib import contextmanager
from src.config import settings
from src.database.adapter import connect_db, is_postgres

def init_db():
    if is_postgres(settings.DATABASE_URL):
        from src.database.schema import SUPABASE_SCHEMA_SQL
        with get_connection() as conn:
            for stmt in SUPABASE_SCHEMA_SQL.split(";"):
                clean_stmt = stmt.strip()
                if clean_stmt:
                    conn.execute(clean_stmt)
            
            # Safe schema migrations for existing PostgreSQL tables
            alter_stmts = [
                "ALTER TABLE documents ADD COLUMN IF NOT EXISTS summary TEXT",
                "ALTER TABLE conversation_documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
                "ALTER TABLE conversation_documents ADD COLUMN IF NOT EXISTS attached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
            ]
            for alter in alter_stmts:
                try:
                    conn.execute(alter)
                except Exception as e:
                    print(f"[DB] Migration notice: {e}")
            conn.commit()
        print("[DB] Initialized Supabase PostgreSQL tables & indexes successfully.")
        return

    db_path = settings.DATABASE_URL
    if os.path.dirname(db_path):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Enable Foreign Keys
        cursor.execute("PRAGMA foreign_keys = ON;")
        
        # Projects table for grouped conversation threads and progress tracking
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                progress INTEGER DEFAULT 0,
                status TEXT DEFAULT 'IN_PROGRESS',
                color TEXT DEFAULT '#d17b24',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)")

        # Conversations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                user_id TEXT,
                project_id TEXT,
                progress INTEGER DEFAULT 0,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
            )
        """)
        
        # Migration for existing conversations
        try:
            cursor.execute("ALTER TABLE conversations ADD COLUMN user_id TEXT;")
        except sqlite3.OperationalError:
            pass # Column already exists
            
        try:
            cursor.execute("ALTER TABLE conversations ADD COLUMN is_pinned BOOLEAN DEFAULT 0;")
        except sqlite3.OperationalError:
            pass # Column already exists
            
        try:
            cursor.execute("ALTER TABLE conversations ADD COLUMN summary TEXT;")
        except sqlite3.OperationalError:
            pass # Column already exists

        try:
            cursor.execute("ALTER TABLE conversations ADD COLUMN project_id TEXT;")
        except sqlite3.OperationalError:
            pass

        try:
            cursor.execute("ALTER TABLE conversations ADD COLUMN progress INTEGER DEFAULT 0;")
        except sqlite3.OperationalError:
            pass

        try:
            cursor.execute("ALTER TABLE conversations ADD COLUMN status TEXT DEFAULT 'active';")
        except sqlite3.OperationalError:
            pass


        
        # Messages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sequence INTEGER NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
            )
        """)

        message_columns = {row[1] for row in cursor.execute("PRAGMA table_info(messages)")}
        if "status" not in message_columns:
            cursor.execute("ALTER TABLE messages ADD COLUMN status TEXT NOT NULL DEFAULT 'complete'")
        
        # Indexes for fast retrieval
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC)")
        
        # Message terms table for analytics
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS message_terms (
                message_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                term TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_message_terms_term ON message_terms(term)")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS message_feedback (
                message_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (message_id, user_id),
                FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_message_feedback_rating ON message_feedback(rating)")
        try:
            cursor.execute("ALTER TABLE message_feedback ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending'")
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute("ALTER TABLE message_feedback ADD COLUMN resolution_note TEXT")
        except sqlite3.OperationalError:
            pass

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_suggestions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                category TEXT NOT NULL,
                message TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                resolution_note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_suggestions_status ON user_suggestions(status)")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS verified_knowledge (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                source_feedback_message_id TEXT NOT NULL UNIQUE,
                question TEXT NOT NULL,
                correction TEXT NOT NULL,
                created_by TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (source_feedback_message_id) REFERENCES messages (id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_verified_knowledge_user_active ON verified_knowledge(user_id, is_active)")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_memories (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                memory_type TEXT NOT NULL DEFAULT 'explicit',
                source_conversation_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (source_conversation_id) REFERENCES conversations (id) ON DELETE SET NULL
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_memories_user_active ON user_memories(user_id, is_active)")

        
        # Phase 5A / 13: Document tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                filename TEXT NOT NULL,
                sha256 TEXT UNIQUE NOT NULL,
                size INTEGER NOT NULL,
                page_count INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT NOT NULL,
                progress REAL DEFAULT 0.0,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        
        # Phase 13 schema migration for existing databases
        try:
            cursor.execute("ALTER TABLE documents ADD COLUMN progress REAL DEFAULT 0.0;")
        except sqlite3.OperationalError:
            pass # Column already exists
            
        try:
            cursor.execute("ALTER TABLE documents ADD COLUMN user_id TEXT;")
        except sqlite3.OperationalError:
            pass # Column already exists
            
        try:
            cursor.execute("ALTER TABLE documents ADD COLUMN summary TEXT;")
        except sqlite3.OperationalError:
            pass # Column already exists

        document_foreign_keys = cursor.execute("PRAGMA foreign_key_list(documents)").fetchall()
        if not any(row[2] == "users" for row in document_foreign_keys):
            conn.commit()
            cursor.execute("PRAGMA foreign_keys = OFF;")
            cursor.execute("""
                CREATE TABLE documents_new (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    filename TEXT NOT NULL,
                    sha256 TEXT UNIQUE NOT NULL,
                    size INTEGER NOT NULL,
                    page_count INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT NOT NULL,
                    progress REAL DEFAULT 0.0,
                    summary TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                INSERT INTO documents_new
                    (id, user_id, filename, sha256, size, page_count, created_at, status, progress, summary)
                SELECT
                    d.id,
                    CASE WHEN u.id IS NULL THEN NULL ELSE d.user_id END,
                    d.filename, d.sha256, d.size, d.page_count, d.created_at,
                    d.status, d.progress, d.summary
                FROM documents d
                LEFT JOIN users u ON u.id = d.user_id
            """)
            cursor.execute("DROP TABLE documents")
            cursor.execute("ALTER TABLE documents_new RENAME TO documents")
            cursor.execute("PRAGMA foreign_keys = ON;")
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_chunks (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                page_start INTEGER NOT NULL,
                page_end INTEGER NOT NULL,
                page_number INTEGER,
                text TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
            )
        """)
        
        try:
            cursor.execute("ALTER TABLE document_chunks ADD COLUMN page_number INTEGER;")
        except sqlite3.OperationalError:
            pass # Column already exists
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversation_documents (
                conversation_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (conversation_id, document_id),
                FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
                FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
            )
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc_id ON document_chunks(document_id)")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS custom_bots (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                personality TEXT NOT NULL,
                accent TEXT NOT NULL DEFAULT 'var(--accent)',
                starter_questions TEXT,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        
        # Migration for existing custom_bots
        try:
            cursor.execute("ALTER TABLE custom_bots ADD COLUMN starter_questions TEXT;")
        except sqlite3.OperationalError:
            pass

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS custom_bot_documents (
                bot_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (bot_id, document_id),
                FOREIGN KEY (bot_id) REFERENCES custom_bots (id) ON DELETE CASCADE,
                FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_custom_bot_documents_bot_id ON custom_bot_documents(bot_id)")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS custom_bot_integrations (
                id TEXT PRIMARY KEY,
                bot_id TEXT NOT NULL UNIQUE,
                owner_id TEXT NOT NULL,
                public_key TEXT NOT NULL UNIQUE,
                secret_hash TEXT NOT NULL,
                enabled BOOLEAN NOT NULL DEFAULT 0,
                allowed_origins TEXT NOT NULL DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP,
                FOREIGN KEY (bot_id) REFERENCES custom_bots (id) ON DELETE CASCADE,
                FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_custom_bot_integrations_owner_id ON custom_bot_integrations(owner_id)")

        # Studio Templates Table (Personal & Team Shared Templates)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS studio_templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT DEFAULT 'process_flow',
                diagram_data TEXT NOT NULL,
                node_count INTEGER DEFAULT 0,
                is_public BOOLEAN NOT NULL DEFAULT 1,
                created_by TEXT,
                created_by_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_studio_templates_public ON studio_templates(is_public)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_studio_templates_created_by ON studio_templates(created_by)")
        
        conn.commit()

@contextmanager
def get_connection():
    conn = connect_db(settings.DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()

