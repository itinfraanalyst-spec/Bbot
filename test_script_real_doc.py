import os
import sys
import time
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from src.services.document_service import DocumentService
from src.services.chat_service import ChatService
from src.llm.provider import QwenProvider
from src.database.document_repository import DocumentRepository
from src.database.repository import ConversationRepository

class DummyBackgroundTasks:
    def add_task(self, func, *args, **kwargs):
        # run synchronously
        func(*args, **kwargs)

def verify_chunks(doc_id):
    import sqlite3
    conn = sqlite3.connect('data/chatbot.db')
    chunks = conn.execute('SELECT chunk_index, page_start, page_end, text FROM document_chunks WHERE document_id = ?', (doc_id,)).fetchall()
    
    samples = []
    found_3, found_21a, found_9 = False, False, False
    
    for c in chunks:
        text = c[3]
        if "Article 3" in text and not found_3:
            samples.append(f"CHUNK FOR Article 3:\nMetadata: filename=constitution.pdf, page_start={c[1]}\n{text[:300]}...\n")
            found_3 = True
        if "Article 21A" in text and not found_21a:
            samples.append(f"CHUNK FOR Article 21A:\nMetadata: filename=constitution.pdf, page_start={c[1]}\n{text[:300]}...\n")
            found_21a = True
        if "Article 9" in text and not found_9:
            samples.append(f"CHUNK FOR Article 9:\nMetadata: filename=constitution.pdf, page_start={c[1]}\n{text[:300]}...\n")
            found_9 = True
            
    return "\n".join(samples)

def run_tests():
    import sqlite3
    conn = sqlite3.connect('data/chatbot.db')
    row = conn.execute('SELECT id FROM documents WHERE filename = ?', ('constitution.pdf',)).fetchone()
    if not row:
        print("Document not found in DB.")
        return
    doc_id = row[0]
    print(f"Using existing Document ID: {doc_id}")
    
    chunk_samples = verify_chunks(doc_id)
    
    chat_service = ChatService(QwenProvider())
    repo = ConversationRepository()
    
    queries = [
        "first design a flowchart to explain the flow of info from frontend to backend in a website",
        "explain article 3",
        "explain article 21A",
        "also article 7", # not in document
        "brief summary of the document",
        "main key points of the document",
        "what are important points for me",
        "draft a reminder email for work",
        "explain article 9"
    ]
    
    results = []
    results.append("===== CHUNKING VERIFICATION =====")
    results.append(chunk_samples)
    results.append("\n===== REAL DOCUMENT TESTS =====")
    
    for q in queries:
        conv_id = f"test_conv_{int(time.time())}"
        repo.create_conversation(conv_id, None)
        DocumentRepository().associate_document_with_conversation(conv_id, doc_id)
        
        for run_idx in range(1, 3):
            start = time.time()
            stream = chat_service.generate_chat_response(q, conv_id, None)
            ans = ""
            for item in stream:
                if item.get("type") == "text":
                    ans += item["content"]
            t = time.time() - start
            if run_idx == 1:
                results.append(f"\n--- QUERY: {q} ---")
                results.append(f"RUN 1 ({t:.2f}s):\n{ans}")
            else:
                results.append(f"\nRUN 2 ({t:.2f}s) [Consistency Check]:\n{ans}")
                
        print(f"Finished querying: {q}")
                
    with open("test_results_real.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(results))
        
    print("Tests completed. Results saved to test_results_real.txt.")

if __name__ == "__main__":
    run_tests()
