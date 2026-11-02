import sys, os, time
sys.path.append(os.getcwd())
import sqlite3
from src.config import settings
from src.llm.provider import QwenProvider
from src.services.chat_service import ChatService

# Create a conversation
conn = sqlite3.connect(settings.DATABASE_URL)
cursor = conn.cursor()
cursor.execute("INSERT INTO conversations (id, title, user_id) VALUES ('test-summ', 'Test', 'opt_user')")

# Insert 22 messages
for i in range(11):
    cursor.execute("INSERT INTO messages (id, conversation_id, role, content, sequence) VALUES (?, ?, ?, ?, ?)", (f'u{i}', 'test-summ', 'user', f'Hello {i}', i*2))
    cursor.execute("INSERT INTO messages (id, conversation_id, role, content, sequence) VALUES (?, ?, ?, ?, ?)", (f'a{i}', 'test-summ', 'assistant', f'World {i}', i*2+1))
conn.commit()
conn.close()

provider = QwenProvider()
service = ChatService(provider)

print("Triggering background summary for conversation 'test-summ'...")
service._run_background_summary('test-summ')

conn = sqlite3.connect(settings.DATABASE_URL)
summary = conn.execute("SELECT summary FROM conversations WHERE id = 'test-summ'").fetchone()[0]
conn.close()

if summary:
    print(f'PASS: Summary generated -> {summary}')
else:
    print('FAIL: Summary not generated.')

# Cleanup
conn = sqlite3.connect(settings.DATABASE_URL)
conn.execute("DELETE FROM messages WHERE conversation_id = 'test-summ'")
conn.execute("DELETE FROM conversations WHERE id = 'test-summ'")
conn.commit()
conn.close()
