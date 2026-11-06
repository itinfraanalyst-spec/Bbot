from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from src.llm.provider import QwenProvider
from src.services.chat_service import ChatService
from src.database.repository import ConversationRepository
from src.database.connection import get_connection, init_db
from src.services.document_service import DocumentService
from src.database.document_repository import DocumentRepository
from src.auth.dependencies import get_current_user
from src.core.rate_limit import limiter
from src.config import settings
import json
import uuid
import os

router = APIRouter()

# Dependency injection
_provider = None
_repo = ConversationRepository()
_doc_service = DocumentService()
_doc_repo = DocumentRepository()

import threading
_provider_lock = threading.Lock()

def get_chat_service() -> ChatService:
    global _provider
    if _provider is None:
        with _provider_lock:
            if _provider is None:
                groq_key = getattr(settings, "GROQ_API_KEY", "") or os.environ.get("GROQ_API_KEY", "")
                llm_env = os.environ.get("LLM_PROVIDER", "").lower()
                from src.llm.provider import Llama, GroqProvider, QwenProvider
                if groq_key or llm_env == "groq" or Llama is None:
                    try:
                        _provider = GroqProvider()
                        print("[PROVIDER] Initialized High-Speed GroqProvider with Local Data Masking.")
                    except Exception as e:
                        print(f"[PROVIDER WARNING] Failed to initialize GroqProvider ({e}).")
                        _provider = GroqProvider()
                else:
                    _provider = QwenProvider()
    return ChatService(_provider)

def get_repository() -> ConversationRepository:
    return _repo

def get_doc_service() -> DocumentService:
    return _doc_service

def get_doc_repo() -> DocumentRepository:
    return _doc_repo

# Ensure DB is initialized at startup
init_db()

class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field("", max_length=500)
    color: Optional[str] = "#d17b24"
    status: Optional[str] = "IN_PROGRESS"
    progress: Optional[int] = Field(0, ge=0, le=100)

class UpdateProjectRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = Field(None, ge=0, le=100)

class AssignProjectRequest(BaseModel):
    project_id: Optional[str] = None

class UpdateConversationProgressRequest(BaseModel):
    progress: Optional[int] = Field(None, ge=0, le=100)
    status: Optional[str] = None

class CreateConversationRequest(BaseModel):
    title: str = "New Conversation"
    project_id: Optional[str] = None

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=12000)
    conversation_id: Optional[str] = None
    truncate_from_message_id: Optional[str] = None
    language: Optional[str] = "en"
    project_id: Optional[str] = None

class MessageFeedbackRequest(BaseModel):
    rating: str = Field(..., pattern="^(positive|negative)$")
    suggestion: Optional[str] = None

class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=12000)
    target_language: str = Field(..., min_length=2, max_length=30)
    
@router.get("/health")
def health_check():
    # Verify SQLite is reachable
    db_status = "ok"
    try:
        # Simple ping to repo
        _repo.list_conversations()
    except Exception as e:
        db_status = "error"
        
    model_loaded = _provider is not None
    
    return {
        "status": "ok", 
        "service": f"chat-bot-2 backend with {'Supabase PostgreSQL' if settings.DATABASE_URL.startswith(('postgres://', 'postgresql://')) else 'SQLite'}",
        "persistence": db_status,
        "model_loaded": model_loaded,
        "rag_enabled": settings.RAG_ENABLED
    }

@router.get("/models")
def list_models(current_user: dict = Depends(get_current_user)):
    return {
        "models": [
            {
                "id": settings.MODEL_NAME,
                "quantization": settings.QUANTIZATION
            }
        ]
    }

# --- Conversation Endpoints ---

@router.post("/conversations")
def create_conversation(req: CreateConversationRequest, repo: ConversationRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    conv_id = repo.create_conversation(title=req.title, user_id=current_user.get("id"), project_id=req.project_id)
    return repo.get_conversation(conv_id)

# --- Projects & Threads Endpoints ---
@router.get("/projects")
def list_user_projects(repo: ConversationRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    projects = repo.list_projects(current_user.get("id"))
    return {"projects": projects}

@router.post("/projects")
def create_user_project(req: CreateProjectRequest, repo: ConversationRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    project = repo.create_project(
        user_id=current_user.get("id"),
        name=req.name.strip(),
        description=req.description.strip() if req.description else "",
        progress=req.progress if req.progress is not None else 0,
        status=req.status or "IN_PROGRESS",
        color=req.color or "#d17b24"
    )
    return project

@router.get("/projects/{project_id}")
def get_user_project(project_id: str, repo: ConversationRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    project = repo.get_project(project_id, current_user.get("id"))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.patch("/projects/{project_id}")
def update_user_project(project_id: str, req: UpdateProjectRequest, repo: ConversationRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    updated = repo.update_project(
        project_id,
        current_user.get("id"),
        name=req.name.strip() if req.name else None,
        description=req.description.strip() if req.description is not None else None,
        progress=req.progress,
        status=req.status,
        color=req.color
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Project not found or not editable")
    return updated

@router.delete("/projects/{project_id}")
def delete_user_project(project_id: str, repo: ConversationRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    success = repo.delete_project(project_id, current_user.get("id"))
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "deleted"}

@router.patch("/conversations/{conversation_id}/project")
def assign_conversation_to_project(conversation_id: str, req: AssignProjectRequest, repo: ConversationRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    success = repo.assign_conversation_project(conversation_id, req.project_id, current_user.get("id"))
    if not success:
        raise HTTPException(status_code=400, detail="Unable to assign conversation to project")
    return {"status": "assigned", "project_id": req.project_id}

@router.patch("/conversations/{conversation_id}/progress")
def update_conversation_progress(conversation_id: str, req: UpdateConversationProgressRequest, repo: ConversationRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    success = repo.update_conversation_progress(conversation_id, current_user.get("id"), progress=req.progress, status=req.status)
    if not success:
        raise HTTPException(status_code=400, detail="Unable to update conversation progress")
    return {"status": "updated", "progress": req.progress, "thread_status": req.status}

@router.get("/conversations")
def list_conversations(repo: ConversationRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    convs = repo.get_conversations_by_user(user_id)
    return {"conversations": convs}

@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str, repo: ConversationRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    conv = repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.get("user_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Forbidden")
    messages = repo.get_messages(conversation_id)
    return {"conversation": conv, "messages": messages}

@router.post("/messages/{message_id}/feedback")
def save_message_feedback(
    message_id: str,
    feedback: MessageFeedbackRequest,
    current_user: dict = Depends(get_current_user),
):
    with get_connection() as conn:
        message = conn.execute("""
            SELECT m.id
            FROM messages m
            WHERE m.id = ? AND m.role = 'assistant'
        """, (message_id,)).fetchone()
        if not message:
            raise HTTPException(status_code=404, detail="Assistant message not found")

        conn.execute("""
            INSERT INTO message_feedback (message_id, user_id, rating)
            VALUES (?, ?, ?)
            ON CONFLICT(message_id, user_id) DO UPDATE SET
                rating = excluded.rating,
                created_at = CURRENT_TIMESTAMP
        """, (message_id, current_user.get("id"), feedback.rating))

        source = None
        if feedback.rating == 'negative' and feedback.suggestion and feedback.suggestion.strip():
            conn.execute("""
                UPDATE message_feedback
                SET review_status = 'approved', resolution_note = ?
                WHERE message_id = ? AND user_id = ?
            """, (feedback.suggestion.strip(), message_id, current_user.get("id")))

            source = conn.execute("""
                SELECT c.user_id, answer.conversation_id, answer.sequence,
                       (SELECT question.content FROM messages question
                        WHERE question.conversation_id = answer.conversation_id
                          AND question.role = 'user'
                          AND question.sequence < answer.sequence
                        ORDER BY question.sequence DESC LIMIT 1) AS question
                FROM messages answer
                JOIN conversations c ON c.id = answer.conversation_id
                WHERE answer.id = ? AND answer.role = 'assistant'
            """, (message_id,)).fetchone()
            
        conn.commit()
        
    if feedback.rating == 'negative' and feedback.suggestion and feedback.suggestion.strip() and source and source["user_id"]:
        from src.database.verified_knowledge_repository import VerifiedKnowledgeRepository
        VerifiedKnowledgeRepository().save(
            user_id=source["user_id"],
            source_feedback_message_id=message_id,
            question=source["question"] or "",
            correction=feedback.suggestion.strip(),
            created_by=current_user["id"],
        )

    return {"message_id": message_id, "rating": feedback.rating}

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, repo: ConversationRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    conv = repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.get("user_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Forbidden")
        
    success = repo.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "deleted"}

@router.post("/conversations/{conversation_id}/pin")
def pin_conversation(conversation_id: str, repo: ConversationRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    conv = repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.get("user_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Forbidden")
        
    success = repo.pin_conversation(conversation_id, current_user.get("id"))
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "pinned"}

@router.post("/conversations/{conversation_id}/unpin")
def unpin_conversation(conversation_id: str, repo: ConversationRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    conv = repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.get("user_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Forbidden")
        
    success = repo.unpin_conversation(conversation_id, current_user.get("id"))
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "unpinned"}

class UpdateConversationTitleRequest(BaseModel):
    title: str

@router.patch("/conversations/{conversation_id}/title")
def update_conversation_title(conversation_id: str, req: UpdateConversationTitleRequest, repo: ConversationRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    conv = repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.get("user_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Forbidden")
        
    success = repo.update_conversation_title(conversation_id, req.title, current_user.get("id"))
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "updated", "title": req.title}

# --- Chat Endpoint ---

def get_user_id(request: Request):
    # Try to extract from authorization header since slowapi runs before dependencies
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        try:
            import jwt
            from src.config import settings
            payload = jwt.decode(auth.split(" ")[1], settings.JWT_SECRET, algorithms=["HS256"], options={"verify_exp": False})
            return payload.get("sub", "unknown")
        except:
            pass
    return request.client.host

@router.post("/chat")
@limiter.limit("10/minute", key_func=get_user_id)
def chat_endpoint(request: Request, chat_req: ChatRequest, service: ChatService = Depends(get_chat_service), repo: ConversationRepository = Depends(get_repository), current_user: dict = Depends(get_current_user)):
    # 1. Resolve conversation
    conv_id = chat_req.conversation_id
    if conv_id:
        conv = repo.get_conversation(conv_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv.get("user_id") != current_user.get("id") and not current_user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Forbidden")
    else:
        # Create a new conversation implicitly if none provided
        # Use first 5 words as title deterministically
        words = chat_req.message.split()
        title = " ".join(words[:5]) + ("..." if len(words) > 5 else "")
        if not title.strip():
            title = "New Conversation"
        conv_id = repo.create_conversation(title=title, user_id=current_user.get("id"), project_id=chat_req.project_id)

    if chat_req.truncate_from_message_id and conv_id:
        repo.truncate_from_message(conv_id, chat_req.truncate_from_message_id)

    if not service.provider.try_reserve_capacity():
        raise HTTPException(status_code=429, detail="Server is currently at maximum capacity. Please try again later.")

    async def event_generator():
        try:
            from fastapi.concurrency import iterate_in_threadpool
            
            # First yield the conversation ID so the client knows it
            yield f"data: {json.dumps({'conversation_id': conv_id})}\n\n"
            
            stream = service.generate_chat_response(
                chat_req.message,
                conv_id,
                user_id=current_user.get("id"),
                reserved=True,
                language=chat_req.language,
            )
            
            async for item in iterate_in_threadpool(stream):
                if await request.is_disconnected():
                    try:
                        stream.close()
                    except Exception:
                        pass
                    break
                    
                if item.get("type") == "text":
                    yield f"data: {json.dumps({'chunk': item['content']})}\n\n"
                elif item.get("type") == "message_id":
                    yield f"data: {json.dumps({'message_id': item['message_id']})}\n\n"
                elif item.get("type") == "status":
                    yield f"data: {json.dumps({'status': item['status']})}\n\n"
                elif item.get("type") == "error":
                    yield f"data: {json.dumps({'error': item['error']})}\n\n"
                    
            if not await request.is_disconnected():
                yield "data: [DONE]\n\n"
        except GeneratorExit:
            pass
        except Exception as e:
            # Generic error handling to prevent stack trace leakage to the client
            print(f"Chat generation error: {e}")
            yield f"data: {json.dumps({'error': 'An internal error occurred during generation.'})}\n\n"
            yield "data: [DONE]\n\n"
        finally:
            service.provider.release_capacity()

    return StreamingResponse(event_generator(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"})

@router.post("/chat/translate")
async def translate_chat_message(
    req: TranslateRequest,
    current_user: dict = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service),
):
    try:
        from fastapi.concurrency import run_in_threadpool
        translated = await run_in_threadpool(service.translate_text, req.text, req.target_language)
        return {
            "translated_text": translated,
            "target_language": req.target_language
        }
    except Exception as e:
        print(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to translate message")

# --- Document Endpoints ---

def check_content_length(request: Request):
    from src.config import settings
    content_length = request.headers.get("content-length")
    if content_length:
        max_size = (settings.MAX_PDF_SIZE_MB * 1024 * 1024) + (2 * 1024 * 1024)  # 2MB buffer for multipart overhead
        if int(content_length) > max_size:
            raise HTTPException(status_code=413, detail="Payload too large.")
    return True

@router.post("/documents", dependencies=[Depends(check_content_length)])
@limiter.limit("5/minute")
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    doc_service: DocumentService = Depends(get_doc_service),
    current_user: dict = Depends(get_current_user)
):
    ext = file.filename.lower().split('.')[-1]
    if ext not in ["pdf", "docx", "xlsx", "csv", "txt", "md", "pptx"]:
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, XLSX, CSV, TXT, MD, and PPTX files are supported.")
        
    max_file_size = settings.MAX_PDF_SIZE_MB * 1024 * 1024
    content = bytearray()
    
    # Check magic bytes on first chunk
    first_chunk = True
    while chunk := await file.read(1024 * 1024):
        if first_chunk:
            if ext == "pdf" and not chunk.startswith(b"%PDF-"):
                raise HTTPException(status_code=400, detail="Invalid PDF file content.")
            elif ext in ["docx", "xlsx", "pptx"] and not chunk.startswith(b"PK\x03\x04"):
                raise HTTPException(status_code=400, detail="Invalid Office document content.")
            elif ext in ["txt", "csv", "md"]:
                try:
                    chunk[:512].decode('utf-8')
                except UnicodeDecodeError:
                    raise HTTPException(status_code=400, detail="Invalid text file content.")
            first_chunk = False
            
        content.extend(chunk)
        if len(content) > max_file_size:
            raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {settings.MAX_PDF_SIZE_MB}MB.")
            
    content = bytes(content)
    if not content:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")
        
    # Deep content validation
    import io
    if ext == "pdf":
        import fitz
        try:
            doc = fitz.open(stream=content, filetype="pdf")
            if doc.page_count < 1:
                raise Exception("Empty PDF")
            doc.close()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid PDF structure.")
    elif ext in ["docx", "xlsx", "pptx"]:
        import zipfile
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as z:
                files = z.namelist()
                if ext == "docx" and "word/document.xml" not in files:
                    raise Exception("Not a DOCX")
                if ext == "xlsx" and "xl/workbook.xml" not in files:
                    raise Exception("Not an XLSX")
                if ext == "pptx" and "ppt/presentation.xml" not in files:
                    raise Exception("Not a PPTX")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid {ext.upper()} structure.")
            
    try:
        result = doc_service.process_uploaded_file(file.filename, content, background_tasks, user_id=current_user.get("id"))
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Document upload error: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred while processing the document.")

@router.get("/documents")
def list_documents(doc_repo: DocumentRepository = Depends(get_doc_repo), current_user: dict = Depends(get_current_user)):
    user_id = None if current_user.get("is_admin") else current_user.get("id")
    return {"documents": doc_repo.list_documents(user_id=user_id)}

@router.get("/documents/{document_id}")
def get_document(document_id: str, doc_repo: DocumentRepository = Depends(get_doc_repo), current_user: dict = Depends(get_current_user)):
    doc = doc_repo.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.get("user_id"):
        raise HTTPException(status_code=403, detail="Document is quarantined (orphaned) and inaccessible")
    if doc.get("user_id") != current_user.get("id") and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    return {"document": doc}

@router.delete("/documents/{document_id}")
def delete_document(document_id: str, doc_repo: DocumentRepository = Depends(get_doc_repo), doc_service: DocumentService = Depends(get_doc_service), current_user: dict = Depends(get_current_user)):
    doc = doc_repo.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.get("user_id"):
        raise HTTPException(status_code=403, detail="Document is quarantined (orphaned) and inaccessible")
    if doc.get("user_id") != current_user.get("id") and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
        
    success = doc_service.delete_document(document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "deleted"}

class AssociateDocumentRequest(BaseModel):
    document_id: str

@router.post("/conversations/{conversation_id}/documents")
def associate_document(conversation_id: str, req: AssociateDocumentRequest, 
                      repo: ConversationRepository = Depends(get_repository),
                      doc_repo: DocumentRepository = Depends(get_doc_repo),
                      current_user: dict = Depends(get_current_user)):
    conv = repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.get("user_id") and conv.get("user_id") != current_user.get("id") and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
        
    document = doc_repo.get_document(req.document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if not document.get("user_id") and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Document is quarantined (orphaned) and inaccessible")
    if document.get("user_id") and document.get("user_id") != current_user.get("id") and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
        
    doc_repo.associate_document_with_conversation(conversation_id, req.document_id)
    return {"status": "associated"}

@router.delete("/conversations/{conversation_id}/documents/{document_id}")
def detach_document(conversation_id: str, document_id: str, repo: ConversationRepository = Depends(get_repository), doc_repo: DocumentRepository = Depends(get_doc_repo), current_user: dict = Depends(get_current_user)):
    conv = repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.get("user_id") and conv.get("user_id") != current_user.get("id") and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
        
    success = doc_repo.detach_document_from_conversation(conversation_id, document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Association not found")
    return {"status": "detached"}

@router.get("/conversations/{conversation_id}/documents")
def get_conversation_documents(conversation_id: str, repo: ConversationRepository = Depends(get_repository), doc_repo: DocumentRepository = Depends(get_doc_repo), current_user: dict = Depends(get_current_user)):
    conv = repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.get("user_id") and conv.get("user_id") != current_user.get("id") and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
        
    docs = doc_repo.get_conversation_documents(conversation_id)
    return {"documents": docs}
