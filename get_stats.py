
import sqlite3

def get_stats():
    try:
        conn = sqlite3.connect('data/chatbot.db')
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM verified_knowledge WHERE is_active = 1")
        vk_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM user_memories WHERE is_active = 1")
        um_count = cursor.fetchone()[0]
        
        print(f"Verified Knowledge: {vk_count}")
        print(f"User Memories: {um_count}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    get_stats()
