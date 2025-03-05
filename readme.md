# Collaborative Text Content Studio with AI Copilot 🚀✍️

## Project Overview

Collaborative Text Content Studio is an advanced platform designed to revolutionize content creation through real-time collaboration and AI-powered assistance.

## 🛠 Project Structure
```
collaborative-text-studio/
├── client/           # React frontend
├── server/           # Node.js backend
└── python/           # Flask AI services
```


![alt text](<WhatsApp Image 2025-03-05 at 12.39.44_7ef7152d.jpg>)

## 📦 Installation and Setup

### Prerequisites
- Node.js (v18+)
- Python 3.8+
- npm
- pip

### Step-by-Step Installation

1. Clone the repository
```bash
git clone [your-repository-link]
cd collaborative-text-studio
```

2. Install Server Dependencies
```bash
cd server
npm install -f
```

3. Install Client Dependencies
```bash
cd ../client
npm install
```

4. Set Up Python Environment
```bash
cd ../python
pip install -r requirements.txt
```

### Running the Application

1. Start Backend Server (in server directory)
```bash
# Terminal 1: Compile TypeScript
cd server
npm run watch

# Terminal 2: Start Development Server
npm run dev
```

2. Start Flask AI Services (in python directory)
```bash
# Terminal 3: Start Flask Main Server
python app.py

# Terminal 4: Start Suggestion Service
python suggestion.py
```

3. Start Frontend (in client directory)
```bash
# Terminal 5: Start React Development Server
cd client
npm run dev
```

### Application Endpoints

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Flask Server: `http://localhost:5000`

🔌 Socket.IO Events Reference
Client-to-Server Events
Document Management

get-all-documents

Retrieves all documents for a user
Requires: token (JWT)
Emits: all-documents event with document list


get-document

Joins a specific document room
Requires: documentId, documentName, token
Actions:

Authenticates user
Assigns unique cursor color
Loads document content
Loads existing drawings


Emits:

load-document with document content
load-drawings with drawing data
users-changed with active users





Collaboration Events

send-changes

Broadcasts text changes to other users
Emits: receive-changes event


cursor-move

Shares cursor position with other users
Emits: cursor-update event


font-change

Broadcasts font style changes
Emits: receive-font-change event



Drawing Events

drawing-update

Updates individual or multiple drawing elements
Emits:

drawings-updated
drawing-element-updated




update-drawings-batch

Updates entire drawing canvas
Emits: drawings-updated event


clear-drawings

Clears all drawings
Emits: drawings-cleared event



Document Operations

save-document

Initiates document save process
Triggers: request-document-state
Emits:

save-confirmed on success
save-error on failure




add-comment

Adds a comment to the document
Requires: documentId, content, userId
Emits: update-comments event



Server-to-Client Events

all-documents: List of user's documents
load-document: Document content
load-drawings: Drawing data
users-changed: Active users list
receive-changes: Text changes
cursor-update: Cursor positions
drawings-updated: Drawing canvas updates
drawing-element-updated: Single drawing element change
update-comments: Document comments

Error Handling Events

auth-error: Authentication failures
save-error: Document save errors

🔒 Authentication

Requires JWT token for most events
User is identified and assigned a unique color
Cursor tracking per user

📝 Notes

Real-time synchronization
Minimal data transfer
Robust error handling
Comprehensive user presence tracking

## 🌐 Application Routes

### Web Routes
- `/`: Landing Page
- `/home`: Main Content Dashboard
- `/documents/:id`: Specific Document
- `/documents/:id/version/:versionId`: Document Version

## ✨ Key Features

### Collaboration Tools
- Real-time collaborative editing
- AI-powered content suggestions
- Version history tracking
- Excalidraw integration
- Speech-to-text typing

### AI Capabilities
- Grammar checking
- Text summarization
- Instant content refinement
- Text analysis (readability, grammar, style)
- AI-generated content templates

## 🔧 Troubleshooting

### Common Issues
- Ensure all dependencies are installed
- Check that all services are running on correct ports
- Verify environment variables

### Dependency Conflicts
```bash
# If encountering dependency issues
npm install -f
pip install --upgrade pip
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request



Project Link: [https://github.com/SaHILL87/AugEnBlick]

