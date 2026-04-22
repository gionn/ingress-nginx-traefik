# Plan: Build Slidev Slideshow — From ingress-nginx to Traefik

## Context

Presentation title: "From ingress-nginx to Traefik — Modernizing Alfresco reverse proxy across helm and docker compose"
Duration: 40 min. Audience: technical but also useful for beginners.
Source: `slides.md` (starter shell exists with title, about me, alfresco intro, ops team, open source projects, empty Toc, blank slide, questions)

## Story arc / Proposed slide sections

### Already in slides.md (keep as-is):
- Frontmatter + title slide
- About me (image-right layout)
- Alfresco intro (image-right layout)
- Ops Readiness Team
- Open Source Projects

### To add (fill between "Open source projects" and "Questions"):

**1. Table of Contents** — fill the existing empty Toc slide with `<Toc minDepth="1" maxDepth="1" />`

**Part 1 — The Problem: ingress-nginx deprecation**
- Slide: "What is an Ingress Controller?" — brief intro for beginners
- Slide: "ingress-nginx is being retired" — Kubernetes blog Nov 2025 announcement, timeline, impact
- Slide: "Why it matters for Alfresco" — charts use ingress-nginx as default; need migration path

**Part 2 — Traefik on Kubernetes**
- Slide: "Why Traefik?" — modern, cloud-native, dynamic config, CRD-based (but also supports standard Ingress)
- Slide: "Installing Traefik" — helm install command with `providers.kubernetesIngressNginx.enabled=true` (backwards compat key detail)
- Slide: "Backwards Compatibility" — `ingress.className` still defaults to `nginx`; can set `ingress.enabled: false` in every sub-component to bring-your-own ingress resources
- Slide: "Migrating an existing cluster" — zero-downtime strategy: run Traefik alongside NGINX in parallel → verify Traefik handles traffic via its own LoadBalancer IP → shift DNS → preserve `nginx` IngressClass → uninstall NGINX; ref: https://doc.traefik.io/traefik/migrate/nginx-to-traefik/ (requires Traefik v3.6.2+)

**Part 3 — KinD Improvements**
- Slide: "The old KinD way" — special cluster config with port mappings, host port exposure
- Slide: "cloud-provider-kind" — new tool, enables LoadBalancer type services natively, closer to real cluster
- Slide: "KinD setup steps" — kind create cluster → install cloud-provider-kind → run it → install Traefik → verify

**Part 4 — Traefik on Docker Compose**
- Slide: "Traefik arrived in Compose first" — Docker Compose adopted Traefik earlier; the broader modernization story
- Slide: "How it works" — labels-based routing, no separate config file, dynamic
- Slide: "Compose extends feature" — commons folder, files must be invoked from within docker-compose dir

**Part 5 — ActiveMQ authentication (ACS 26+)** _(small, cross-environment)_
- Slide: "ActiveMQ auth enabled by default" — applies to both Compose and Helm; `alfresco-activemq:6.2.x` image; `ACTIVEMQ_ADMIN_LOGIN`/`ACTIVEMQ_ADMIN_PASSWORD` on broker, `SPRING_ACTIVEMQ_USER`/`SPRING_ACTIVEMQ_PASSWORD` in each connecting service

**Part 6 — Summary**
- Slide: "What do you need to do?" — actionable bullets: Helm → switch ingress controller; Compose → already done; KinD → update cluster setup
- Slide: "The bigger picture" — consistent Traefik across all environments (Helm + Compose), long-term maintenance simplicity

### Final slide (keep as-is):
- Questions slide

## Key technical details to include

### Traefik Helm install command:
```sh
helm repo add traefik https://traefik.github.io/charts
helm repo update
helm upgrade --install traefik traefik/traefik \
  --set providers.kubernetesIngressNginx.enabled=true \
  --set logs.access.enabled=true \
  --namespace traefik --create-namespace
```

### ingress-nginx (old, deprecated):
```sh
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --version 4.12.0 \
  --set controller.config.allow-snippet-annotations=true \
  --set controller.config.annotations-risk-level=Critical
```

### KinD old way (for contrast):
```shell
cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
  - containerPort: 443
    hostPort: 443
EOF
```

### KinD new way:
```sh
kind create cluster
brew install cloud-provider-kind
sudo cloud-provider-kind  # run in background
# then install Traefik normally
```

## Files to modify

- `slides.md` — primary target; all slides go here

## Snippets / images

- snippets/ and images/ directories are currently empty — can add code snippets if useful
- `<<< @/snippets/traefik-install.sh` pattern available

## Verification

1. `npm run dev` and browse localhost:3030 — verify slides render
2. Count slides × avg time to ensure ~40min duration
3. Check Toc renders correctly after adding `level: 1` frontmatter to section slides

## Decisions / Open questions

- Should code blocks use `{lines: true}` with click-through highlighting? → Recommend yes for install commands
- Should we add `layout: section` slides to break the 5 parts visually? → Yes, use per-slide frontmatter
- Images? → The images/ folder is empty; can use Unsplash or SVG URLs inline as done in existing slides
- Should the `ingress-nginx.md` old KinD config appear as a "before/after" comparison? → Recommend two-cols layout
