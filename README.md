# CaseQuery — Starter

This repo is a minimal Next.js + OpenAI + Pinecone starter for a PDF Q&A tool.

## Quick deploy (high level)
1. Create required accounts:
   - OpenAI (API key)
   - Pinecone (API key, environment, create an index)
   - GitHub (you have this)
   - Vercel (connect to GitHub)
2. Create a new GitHub repo, paste the files from this starter into it, commit.
3. On Vercel: Import project from GitHub. Set environment variables below in Vercel Settings -> Environment Variables.
4. Deploy.

## Required environment variables (Vercel)
- OPENAI_API_KEY : your OpenAI API key
- PINECONE_API_KEY : your Pinecone API key
- PINECONE_ENVIRONMENT : your Pinecone environment (e.g. us-west1-gcp)
- PINECONE_INDEX : name of the Pinecone index (create in Pinecone console)
- SESSION_SECRET : random string for session signing (any text)
- MAX_UPLOAD_PAGES (optional) : integer, max pages to allow per upload (default 800)

## Pinecone setup
- Create an index in Pinecone console. The index dimension must match the OpenAI embedding model dimension (use the recommended embedding model from OpenAI; check docs). A commonly used dimension is 1536 for many embedding models — set the index dimension accordingly. (If unsure, create index with 1536.)
- Note your index name and environment; use those in `PINECONE_INDEX` and `PINECONE_ENVIRONMENT`.

## How it works (developer notes)
- `pages/api/upload.js` accepts a PDF, extracts text, chunks it, creates embeddings via OpenAI, and upserts vectors to Pinecone. Each vector stores metadata `{ docId, originalName, page, chunkIndex }`.
- `pages/api/query.js` takes a doc id + question, creates an embedding for the question, queries Pinecone for top-k chunks, then calls OpenAI chat to produce an answer that cites source chunks.

## Next steps
- Replace placeholders and tune prompts.
- Add auth (Supabase or Auth0) before public launch.
- Implement deletion and retention policies for security.