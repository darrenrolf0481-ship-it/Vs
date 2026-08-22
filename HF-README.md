---
title: VS Code Web with Local AI & Ollama
emoji: 💻
colorFrom: purple
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# VS Code Web with Local Ollama Support

This is a custom Docker Space running a remote VS Code IDE workspace alongside local AI acceleration.

## Setup Instructions
1. Download `Dockerfile.txt` and rename it to `Dockerfile`.
2. Download `entrypoint.sh.txt` and rename it to `entrypoint.sh`.
3. Download `git-backup.sh.txt` and rename it to `git-backup.sh`.
4. Create a new Space on Hugging Face:
   - Select **Docker** as the SDK.
   - Choose **Blank** template.
5. Upload `README.md` (this file), `Dockerfile`, and `entrypoint.sh` to the files tab.
6. Let Hugging Face compile and launch your container.
