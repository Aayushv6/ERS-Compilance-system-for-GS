import os
from pymongo import MongoClient
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langgraph.graph import START, StateGraph
from typing_extensions import List, TypedDict
from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.vectorstores import InMemoryVectorStore 
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate 

# --- API KEY CONFIGURATION ---
os.environ["GOOGLE_API_KEY"] = "your API KEY"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    question: str

# --- MONGODB SETUP ---
client = MongoClient("your mongo url")
db = client["GS"]
# Verify these match your MongoDB Compass collection names exactly!
collections = ["departments", "events", "responses"]

# --- VECTOR STORE & EMBEDDINGS ---
embedding_model = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
vector_store = InMemoryVectorStore(embedding=embedding_model)
def extract_text_from_record(record):
    # Expanded list of "Junk" to ignore
    ignore_fields = ["_id", "__v", "token", "password", "createdAt", "updatedAt"]
    text_parts = []
    
    for key, value in record.items():
        if key in ignore_fields: 
            continue
            
        # Clean up the key name (e.g., "deptName" -> "Department Name")
        display_key = key.replace('_', ' ').title()
        
        if isinstance(value, list):
            # If it's a list of objects (like questions), extract just the text
            items = []
            for item in value:
                if isinstance(item, dict) and 'text' in item:
                    items.append(item['text'])
                else:
                    items.append(str(item))
            text_parts.append(f"{display_key}: {', '.join(items)}")
            
        elif isinstance(value, (str, int, float)):
            text_parts.append(f"{display_key}: {value}")
            
        elif isinstance(value, datetime):
            text_parts.append(f"{display_key}: {value.strftime('%B %d, %Y')}")
            
    return ". ".join(text_parts)

def fetch_and_index_documents():
    print("Indexing MongoDB documents...")
    all_documents = []
    try:
        for coll_name in collections:
            coll = db[coll_name]
            count = 0
            for record in coll.find():
                content = extract_text_from_record(record)
                metadata = {"collection": coll_name, "_id": str(record.get("_id"))}
                all_documents.append(Document(page_content=content, metadata=metadata))
                count += 1
            print(f"  Found {count} records in '{coll_name}'")

        if not all_documents:
            print(" WARNING: No documents found in MongoDB.")
            return

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        split_docs = text_splitter.split_documents(all_documents)
        vector_store.add_documents(split_docs)
        print(f" Indexing complete. {len(split_docs)} chunks ready.")
    except Exception as e:
        print(f"Index Error: {e}")

# Run indexing once on startup
fetch_and_index_documents()

# --- RAG LOGIC ---
prompt = ChatPromptTemplate.from_template(
    """You are a helpful Compliance Assistant for the GS Project. 
    
    ### RULES:
    1. **No Technical Junk**: Never mention 'ObjectId', database IDs, or internal codes.
    2. **Conversational Tone**: Answer like a human coworker. 
    3. **Summarize**: Provide a concise summary of findings.
    
    ### FORMATTING RULES (STRICT):
    - **Each sentence MUST start on a new line.** Do not group sentences into paragraphs.
    - Use double newlines (\\n\\n) to separate different topics or departments.
    - Use standard bullet points for lists.
    - Use **Bold** for names, departments, and dates.

    Context: 
    {context} 

    Question: 
    {question} 

    Response:
    """
)

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")
class State(TypedDict):
    question: str
    context: List[Document]
    answer: str

def retrieve(state: State):
    retrieved_docs = vector_store.similarity_search(state["question"])
    return {"context": retrieved_docs}

def generate(state: State):
    docs_content = "\n\n".join(doc.page_content for doc in state["context"])
    messages = prompt.invoke({"question": state["question"], "context": docs_content})
    response = llm.invoke(messages)
    print(f" AI Response: {response.content}") 
    return {"answer": response.content}

graph_builder = StateGraph(State).add_sequence([retrieve, generate])
graph_builder.add_edge(START, "retrieve")
graph = graph_builder.compile()

# --- API ENDPOINTS ---
@app.get("/")
async def health_check():
    return {"status": "online", "message": "Compliance AI is ready."}

@app.post("/ask")
async def chatbot_interface(request: ChatRequest):
    try:
        response = graph.invoke({"question": request.question})
        return {"answer": response.get("answer", "No answer found.")}
    except Exception as e:
        print(f" Processing Error: {str(e)}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
