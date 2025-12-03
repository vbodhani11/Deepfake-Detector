
### Option B: Create a Public URL (Recommended)

**Note:** You need to run BOTH backend and frontend for the app to work. The `start.sh` script is for local development only. On the VM, you'll run them separately.

1. **SSH into your VM** via browser

2. **Install Node.js and npm** (if not already installed)
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   node --version  # Verify installation
   ```

3. **Install Python dependencies** (for backend)
   ```bash
   sudo apt-get update
   sudo apt-get install -y python3 python3-pip python3-venv ffmpeg
   ```

4. **Clone your repository**
   ```bash
   git clone https://github.com/vbodhani11/Deepfake-Detector.git
   cd Deepfake-Detector
   ```

5. **Install PostgreSQL** (if not already installed)
   ```bash
   sudo apt-get update
   sudo apt-get install -y postgresql postgresql-contrib
   
   # Start PostgreSQL service
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

6. **Set up PostgreSQL database**
   ```bash
   # Switch to postgres user
   sudo -u postgres psql
   
   # In PostgreSQL prompt, run:
   CREATE USER deepfake_user WITH PASSWORD 'deepfake_detector';
   CREATE DATABASE deepfake_detector OWNER deepfake_user;
   GRANT ALL PRIVILEGES ON DATABASE deepfake_detector TO deepfake_user;
   \q  # Exit PostgreSQL
   ```

7. **Set up Backend environment variables**
   ```bash
   cd backend
   cp env.example .env
   
   # Edit .env file with your database credentials
   nano .env
   # Or use vi: vi .env
   ```
   
   **Update these values in .env:**
   ```env
   POSTGRES_SERVER=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=deepfake_user
   POSTGRES_PASSWORD=deepfake_detector
   POSTGRES_DB=deepfake_detector
   POSTGRES_SSL_MODE=disable
   
   # Update CORS to include your frontend URL
   BACKEND_CORS_ORIGINS=["http://35.243.177.147:8080","http://localhost:8080"]
   
   # Set a secure secret key (generate one with this command):
   # openssl rand -hex 32
   SECRET_KEY=your-random-secret-key-here-generate-with-openssl-rand-hex-32
   ```
   
   **Generate a secure SECRET_KEY:**
   ```bash
   openssl rand -hex 32
   # Copy the output and paste it as SECRET_KEY in .env
   ```

8. **Set up and start the Backend** (in one terminal/screen session)
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   # Run database migrations
   alembic upgrade head
   
   # Start backend server (runs on port 8000)
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   **Keep this running!** The backend needs to stay active.

9. **Set up and start the Frontend** (in a NEW terminal/screen session)
   
   **Using screen (recommended - keeps services running):**
   ```bash
   # Install screen if not already installed
   sudo apt-get install -y screen
   
   # Start frontend in a screen session
   screen -S frontend
   cd ~/Deepfake-Detector/UI
   npm install
   npm run build
   cd dist
   python3 -m http.server 8080 --bind 0.0.0.0
   # Press Ctrl+A then D to detach
   ```
   
   **Note:** If you haven't started the backend in screen yet, do that first:
   ```bash
   screen -S backend
   cd ~/Deepfake-Detector/backend
   source venv/bin/activate
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   # Press Ctrl+A then D to detach
   ```

10. **Configure firewall** to allow HTTP/HTTPS traffic:
   ```bash
   # Allow HTTP (port 80) and HTTPS (port 443)
   gcloud compute firewall-rules create allow-http-https \
     --allow tcp:80,tcp:443,tcp:8000,tcp:8080 \
     --source-ranges 0.0.0.0/0 \
     --target-tags http-server
   
   # Add tag to your VM (replace YOUR_VM_NAME and YOUR_ZONE)
   gcloud compute instances add-tags instance-20250918-020237 \
     --zone us-east1-c \
     --tags http-server
   ```

11. **Get your public IP**:
   ```bash
   # In VM, get external IP
   curl -H "Metadata-Flavor: Google" http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip
   ```

12. **Access your app**:
   - **Frontend**: `http://YOUR_EXTERNAL_IP` (if using nginx) or `http://35.243.177.147:8080` (if using Python server)
   - **Backend API**: `http://35.243.177.147:8000`
   - **API Docs**: `http://35.243.177.147:8000/docs`

13. **Update frontend API URL** (if backend is on different port/IP):
    ```bash
    # Create .env.production file
    cd UI
    echo "VITE_API_BASE_URL=http://35.243.177.147:8000/api" > .env.production
    
    # Rebuild
    npm run build
    
    # Restart nginx or Python server
    ```

**Important Notes:**
- ⚠️ The `start.sh` script is for **local development only** - don't use it on the VM
- ✅ Use `screen` or `tmux` to keep both services running after you disconnect
- ✅ Backend must be running on port 8000 for the frontend to work
- ✅ Make sure firewall rules allow traffic on ports 80, 443, 8000, and 8080

---
