import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from src.llm.provider import QwenProvider
from src.core.prompt_builder import PromptBuilder

def run_tests():
    provider = QwenProvider()
    pb = PromptBuilder()

    queries = [
        "Draw a flowchart of the hiring process",
        "explain article 3",
        "explain article 21A",
        "article 7",
        "Give me a brief summary of the document",
        "Draft a reminder email to the team about the upcoming meeting",
        "What are the important points for me?"
    ]

    retrieved_context = (
        "[Document: test_doc.pdf | Page 1]\nArticle 3 states that all employees must wash hands before returning to work.\n"
        "[Document: test_doc.pdf | Page 2]\nArticle 21A dictates that mandatory safety gear must be worn at all times in the facility.\n"
        "[Document: test_doc.pdf | Page 3]\nThe hiring process involves four main steps: Application Submission, HR Interview, Technical Interview, Offer Letter, and finally Onboarding."
    )

    for q in queries:
        print("="*80)
        print("QUERY:", q)
        print("-" * 80)
        prompt = pb.build_prompt([{"role": "user", "content": q}], retrieved_context=retrieved_context)
        stream = provider.generate_stream(prompt, max_tokens=800, temperature=0.2)
        out = ""
        for chunk in stream:
            if chunk.get("type") == "text":
                out += chunk["content"]
                print(chunk["content"], end="", flush=True)
        print("\n")

if __name__ == "__main__":
    run_tests()
