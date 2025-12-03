
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

5. **Set up and start the Backend** (in one terminal/screen session)
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   # Start backend server (runs on port 8000)
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   **Keep this running!** The backend needs to stay active.

6. **Set up and start the Frontend** (in a NEW terminal/screen session)
   
   **Option A: Using screen (recommended - keeps services running)**
   ```bash
   # Install screen to run multiple sessions
   sudo apt-get install -y screen
   
   # Start backend in a screen session
   screen -S backend
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   # Press Ctrl+A then D to detach
   
   # Start frontend in another screen session
   screen -S frontend
   cd UI
   npm install
   npm run build
   cd dist
   python3 -m http.server 8080
   # Press Ctrl+A then D to detach
   ```
   
   **Option B: Using nginx for frontend (better for production)**
   ```bash
   # Build frontend
   cd UI
   npm install
   npm run build
   
   # Install nginx
   sudo apt-get install -y nginx
   
   # Copy built files
   sudo cp -r dist/* /var/www/html/
   
   # Start nginx
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

7. **Configure firewall** to allow HTTP/HTTPS traffic:
   ```bash
   # Allow HTTP (port 80) and HTTPS (port 443)
   gcloud compute firewall-rules create allow-http-https \
     --allow tcp:80,tcp:443,tcp:8000,tcp:8080 \
     --source-ranges 0.0.0.0/0 \
     --target-tags http-server
   
   # Add tag to your VM (replace YOUR_VM_NAME and YOUR_ZONE)
   gcloud compute instances add-tags YOUR_VM_NAME \
     --zone YOUR_ZONE \
     --tags http-server
   ```

8. **Get your public IP**:
   ```bash
   # In VM, get external IP
   curl -H "Metadata-Flavor: Google" http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip
   ```

9. **Access your app**:
   - **Frontend**: `http://YOUR_EXTERNAL_IP` (if using nginx) or `http://YOUR_EXTERNAL_IP:8080` (if using Python server)
   - **Backend API**: `http://YOUR_EXTERNAL_IP:8000`
   - **API Docs**: `http://YOUR_EXTERNAL_IP:8000/docs`

10. **Update frontend API URL** (if backend is on different port/IP):
    ```bash
    # Create .env.production file
    cd UI
    echo "VITE_API_BASE_URL=http://YOUR_EXTERNAL_IP:8000/api" > .env.production
    
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
