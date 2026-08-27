# Oracle Cloud Always Free Backend

This guide hosts the Express and Socket.io backend on an Oracle Cloud Always Free Ubuntu VM. The frontend can remain on Netlify.

## 1. Create the VM

Open https://cloud.oracle.com and create an Always Free Compute instance:

- Image: Ubuntu 22.04 or Ubuntu 24.04
- Shape: `VM.Standard.E2.1.Micro` or another Always Free shape
- Add your SSH public key
 Record the VM public IP address.
 Point a domain name or subdomain to this IP. Netlify's HTTPS frontend should use an HTTPS backend.

Oracle may require payment-card verification for account creation. Always Free resources do not incur charges when you stay within the free limits, but review the account terms before continuing.
## 6. Enable HTTPS

After your domain points to the VM, install a free Let's Encrypt certificate:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.YOUR_DOMAIN.com
```

Choose the option to redirect HTTP to HTTPS. Test the API at:

```text
https://api.YOUR_DOMAIN.com/
```

## 7. Connect Netlify
VITE_API_URL=https://api.YOUR_DOMAIN.com
VITE_SOCKET_URL=https://api.YOUR_DOMAIN.com
In Oracle Cloud, open the VM's Virtual Cloud Network security list and allow ingress:
Trigger a new Netlify deploy after saving the variables.
- TCP `80` from `0.0.0.0/0`
- TCP `443` from `0.0.0.0/0` (after HTTPS setup)

SSH into the VM:

```bash
ssh ubuntu@YOUR_VM_PUBLIC_IP
```

Configure the Ubuntu firewall:

```bash
sudo apt update
sudo apt install -y git curl nginx
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## 3. Install Node.js and PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
node --version
npm --version
```

## 4. Download and configure the backend

```bash
git clone https://github.com/Sahanaullagaddi/Veloop_rewards.git
cd Veloop_rewards/backend
npm ci
nano .env
```

Put these values in `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/veloop
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
NODE_ENV=production
```

Do not commit this file.

Start the backend:

```bash
pm2 start src/server.js --name veloop-backend
pm2 save
pm2 startup
```

Run the command printed by `pm2 startup`, then check:

```bash
pm2 status
pm2 logs veloop-backend
```

## 5. Put Nginx in front of Node.js

```bash
sudo nano /etc/nginx/sites-available/veloop
```

Use this configuration, replacing `YOUR_DOMAIN_OR_IP` if you have a domain:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/veloop /etc/nginx/sites-enabled/veloop
sudo nginx -t
sudo systemctl reload nginx
```

Test the API:

```text
http://YOUR_VM_PUBLIC_IP/
```

Expected response:

```json
{"message":"VELoop Tap & Earn API"}
```

## 6. Connect Netlify

In Netlify, open **Site configuration > Environment variables** and add:

```env
VITE_API_URL=http://YOUR_VM_PUBLIC_IP
VITE_SOCKET_URL=http://YOUR_VM_PUBLIC_IP
```

If you configure a domain and HTTPS, use `https://YOUR_DOMAIN` for both values. Trigger a new Netlify deploy after saving the variables.

## 7. MongoDB Atlas

Create a free MongoDB Atlas cluster, create a database user, and allow the Oracle VM public IP in Network Access. Copy the Atlas connection string into `MONGODB_URI` on the VM. Do not use the local MongoDB fallback for production because its data is temporary.
