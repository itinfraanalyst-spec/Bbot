import pytest
from fastapi.testclient import TestClient
from src.api.main import app
from src.database.connection import init_db, get_connection
from src.database.repository import ConversationRepository

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

def test_project_crud_and_threads():
    # Insert a test user
    test_user_id = "test-project-flow-user"
    with get_connection() as conn:
        conn.execute("INSERT OR IGNORE INTO users (id, username, password_hash, is_admin) VALUES (?, ?, 'hash', 0)", (test_user_id, "project_tester"))
        conn.commit()

    repo = ConversationRepository()

    # 1. Create project
    proj = repo.create_project(
        user_id=test_user_id,
        name="HR Revamp 2026",
        description="Overhauling all SOPs",
        progress=25,
        status="IN_PROGRESS",
        color="#3b82f6"
    )
    assert proj["name"] == "HR Revamp 2026"
    assert proj["progress"] == 25
    assert proj["status"] == "IN_PROGRESS"
    assert proj["thread_count"] == 0

    # 2. Create threads under project
    conv1_id = repo.create_conversation("Leave Policy Thread", user_id=test_user_id, project_id=proj["id"])
    conv2_id = repo.create_conversation("POSH Policy Thread", user_id=test_user_id, project_id=proj["id"])

    # 3. List projects
    projects = repo.list_projects(test_user_id)
    assert len(projects) >= 1
    found = next((p for p in projects if p["id"] == proj["id"]), None)
    assert found is not None
    assert found["thread_count"] == 2

    # 4. Get project details with threads
    details = repo.get_project(proj["id"], test_user_id)
    assert len(details["threads"]) == 2
    thread_titles = [t["title"] for t in details["threads"]]
    assert "Leave Policy Thread" in thread_titles
    assert "POSH Policy Thread" in thread_titles

    # 5. Update project progress
    updated = repo.update_project(proj["id"], test_user_id, progress=80, status="REVIEW")
    assert updated["progress"] == 80
    assert updated["status"] == "REVIEW"

    # 6. Update thread progress
    repo.update_conversation_progress(conv1_id, test_user_id, progress=100, status="completed")
    conv1 = repo.get_conversation(conv1_id)
    assert conv1["progress"] == 100
    assert conv1["status"] == "completed"

    # 7. Unassign thread from project
    repo.assign_conversation_project(conv1_id, None, test_user_id)
    details_after = repo.get_project(proj["id"], test_user_id)
    assert len(details_after["threads"]) == 1

    # 8. Delete project (remaining thread becomes unassigned, not deleted)
    repo.delete_project(proj["id"], test_user_id)
    conv2 = repo.get_conversation(conv2_id)
    assert conv2 is not None
    assert conv2["project_id"] is None

    # Cleanup
    repo.delete_conversation(conv1_id)
    repo.delete_conversation(conv2_id)
    with get_connection() as conn:
        conn.execute("DELETE FROM users WHERE id = ?", (test_user_id,))
        conn.commit()
