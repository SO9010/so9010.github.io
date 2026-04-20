# Expanding My Home Server: Proxmox, Ente, and My First Steps Into Clustering

It's been a few days since my last update, and most of that time has been spent researching, experimenting, and trying to understand how I wanted my home server setup to grow.

I got very lucky during this process: my girlfriend's dad was getting rid of an old workstation from his workplace, and he gave it to me for free. This was a huge upgrade and meant I could finally move beyond my single-machine setup.

With this new hardware, I decided to expand my infrastructure using Proxmox, a hypervisor and VM manager that supports clustering and live migration. I'll be keeping my small Wyse machine as a backup server, while the new workstation becomes the core of the cluster. My end goal is to move towards an Infrastructure as Code (IaC) style setup, so that if something goes wrong with the hardware, I can easily migrate or rebuild the entire environment.

---

## Installing Proxmox

The first step was installing Proxmox Virtual Environment on both machines. I used the graphical installer, which functioned much like installing any other Linux distribution.

During setup, I used Bitwarden to generate a strong, random username and password. Once installation was complete, I connected to the Proxmox web interface through my local network.

One of my first configuration steps was setting up my HDDs as shared storage devices. This allows both machines in the cluster to access the same storage, which is essential for VM migration and future scalability.

---

## Creating the Ubuntu VM

With Proxmox running, I created an Ubuntu virtual machine to host both Ente and Nextcloud.

- Storage: HDD (SSDs were almost full)
- RAM: 4 GB
- CPU: 4 cores

This is more than enough for my current needs, and the beauty of Proxmox is that resources can be easily expanded later if required.

---

## Installing Ente (Self-Hosted)

To install Ente, I followed the official Quickstart – Self-Hosting guide and used their installation script. After running the test command, everything worked correctly on localhost.

However, when testing again across my local network, I ran into an issue: the web app couldn't communicate with the "museum" service (the database).

After some investigation, I realised this was because the services were still trying to communicate via localhost. Once I updated the configuration to use the machine's local IP address instead, everything worked perfectly again — I was able to create an account successfully.

---

## Exposing the Service to the Internet (Safely)

At this point, Ente worked locally, but I wanted access from the public internet. This was the part I was most cautious about, as exposing services directly can introduce serious security risks.

To minimise this risk, I decided to use Caddy as a reverse proxy. This means I only need to expose ports 80 and 443, rather than the application itself.

I followed Ente's recommended reverse proxy setup and then added the necessary second-level domains in my Cloudflare dashboard, allowing DNS to resolve to my public IP address.

Once everything was in place, I opened the required ports on my router…

Success: https://photos.oldham.fyi now works from the open internet.

---

## Fixing Storage Limits (Ente CLI)

Logging in and creating an account worked as expected, but I quickly hit Ente's default 10 GB storage limit.

Since this is my own self-hosted instance, the solution was to use the Ente CLI to promote my account to an admin and remove the storage limit entirely.

After installing the CLI and adjusting my account permissions, I now have effectively unlimited storage.

---

## What's Next?

With Ente up and running securely on the internet, the next step is to:

- Set up my backup Proxmox server
- Continue moving toward a reproducible, Infrastructure-as-Code-style setup

Overall, this has been a challenging but extremely rewarding experience, and I've learned a huge amount about virtualisation, networking, and safely exposing services to the internet.
