---
theme: default
background: https://images.unsplash.com/photo-1621537108694-3a8259512251?q=80&w=1365&auto=format&fit=crop
title: From ingress-nginx to Traefik
info: |
  Alfresco is moving from ingress-nginx to Traefik for Helm deployments, bringing
  a more modern and maintainable approach to reverse proxying in acs-deployment.
  This presentation gives an overview of the change, the new Traefik guidance for
  Kubernetes, and the compatibility choices that still matter during the
  transition. It also looks at KinD deployments, where cloud-provider-kind makes
  local testing much closer to a real cluster.
class: text-center
drawings:
  persist: false
transition: slide-left
comark: true
duration: 40min
canvasWidth: 720
---
# From ingress-nginx to Traefik

Giovanni Toraldo

Hyland

---
layout: image-right
image: https://avatars.githubusercontent.com/u/71768
---

# About me

* DevOps Engineer at Hyland
* Reenactor during the weekends
* More about me on [gionn.net](https://gionn.net)

---
layout: image-right
image: https://www.svgrepo.com/show/353382/alfresco.svg
backgroundSize: contain
---

# Alfresco

Open Source document, process and governance management suite.

Alfresco is designed to help organizations efficiently manage their content and
improve productivity.

---

# Ops readiness team

My team ensures that Alfresco can be deployed and operated reliable in multiple
environments. We focus on:

* Helm charts and GitOps best practices
* Docker images and Compose for local development
* CI/CD pipelines and automation
* Performance testing and monitoring 🆕

---

# Open source projects we maintain

* Containerized deployments:
  * [acs-deployment](https://github.com/Alfresco/acs-deployment) umbrella Helm
    chart for the whole stack and compose files for local development
  * [alfresco-helm-charts](https://github.com/Alfresco/alfresco-helm-charts):
    component-level charts for more flexibility
  * [alfresco-dockerfiles-bakery](https://github.com/Alfresco/alfresco-dockerfiles-bakery)
* Classic deployments:
  * [alfresco-ansible](https://github.com/Alfresco/alfresco-ansible-deployment)

---

# Table of contents

<Toc minDepth="1" maxDepth="1" />

---
layout: section
---

# Part 1
## The Problem: ingress-nginx deprecation

---

# What is an Ingress Controller?

An **Ingress Controller** is a Kubernetes component that manages external HTTP/HTTPS
access to services inside a cluster.

It watches `Ingress` resources and programs a reverse proxy accordingly.

```
Internet → LoadBalancer → Ingress Controller → Services → Pods
```

* Routes traffic based on hostnames and paths
* Handles TLS termination
* Can enforce rate limits, auth, redirects, …

> Without an Ingress Controller, `Ingress` resources have no effect.

---

# ingress-nginx is being retired

The Kubernetes project officially announced the **retirement of ingress-nginx**
in November 2025.

After March 2026:

* No new releases or feature updates
* No security patches
* No bug fixes

<br>

> "Users are encouraged to migrate to a maintained ingress controller."
>
> — [kubernetes.io/blog, November 2025](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)

---

# Why it matters for Alfresco

`acs-deployment` has used **ingress-nginx as the default** Ingress Controller
for Helm deployments since day one.

Staying on ingress-nginx means:

* Running **unpatched** software after the EOL date
* Increasing **security risk** over time
* Falling behind on Kubernetes compatibility

<br>

We need a modern, maintained replacement — and we chose **Traefik**.

---
layout: section
---

# Part 2
## Traefik on Kubernetes

---

# Why Traefik?

[Traefik](https://traefik.io/) is a modern, cloud-native reverse proxy and
Ingress Controller actively maintained by Traefik Labs.

* Supports standard Kubernetes `Ingress` resources **and** its own CRDs (`IngressRoute`)
* Built-in dashboard, metrics, tracing, access logs
* Actively developed, well-documented, widely adopted

Our charts use **standard `Ingress` resources** for broad compatibility — no
CRD migration required - except for a few nginx-specific annotations.

---

# Installing Traefik

```sh {1-2|3-6|all}
helm repo add traefik https://traefik.github.io/charts
helm repo update
helm upgrade --install traefik traefik/traefik \
  --set providers.kubernetesIngressNginx.enabled=true \
  --set logs.access.enabled=true \
  --namespace traefik --create-namespace
```

<br>

`providers.kubernetesIngressNginx.enabled=true` tells Traefik to watch
`Ingress` resources with `ingressClassName: nginx` — **no changes to existing
Ingress objects needed**.

```sh
kubectl wait --namespace traefik \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/name=traefik \
  --timeout=90s
```

---

# Backwards Compatibility

Our charts keep `ingressClassName: nginx` as the default — **existing
deployments continue to work** after switching the controller.

Fine-grained control via chart values:

| Value | Effect |
|---|---|
| `.ingress.className` | override the IngressClass name |
| `.ingress.annotations` | pass controller-specific annotations |
| `.ingress.enabled: false` | disable bundled Ingress; bring your own |

<br>

Setting `ingress.enabled: false` on each sub-chart lets you manage Ingress
resources yourself — useful for GitOps or custom setups.

---
layout: two-cols
---

# Migrating an existing cluster

Zero-downtime strategy from the [official Traefik guide](https://doc.traefik.io/traefik/migrate/nginx-to-traefik/)
_(requires Traefik ≥ v3.6.2)_

::left::

**Steps**

1. Install Traefik **alongside** NGINX (both serve traffic)
2. Verify Traefik handles your Ingresses via its own LoadBalancer IP
3. Add Traefik IP to DNS — progressive traffic shift
4. Remove NGINX IP from DNS, wait for propagation
5. **Preserve the `nginx` IngressClass** before uninstalling
6. Delete NGINX admission webhook, uninstall NGINX

::right::

**Key insight**

```
Before:
  DNS → NGINX LB → Services

During:
  DNS → NGINX LB  → Services
      → Traefik LB → Services

After:
  DNS → Traefik LB → Services
```

Existing `Ingress` resources with `ingressClassName: nginx`
**keep working unchanged** — Traefik translates nginx annotations automatically.

---
layout: section
---

# Part 3
## KinD Improvements

---
layout: two-cols
---

# The old KinD way

Running ingress-nginx on KinD required a custom cluster with **hardcoded host
port mappings**.

::left::

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

::right::

Problems:

* Ports 80 and 443 must be **free on the host**
* Requires a **special ingress-nginx build** for KinD
* Cluster config is tightly coupled to the ingress controller
* Not representative of a real Kubernetes environment

---

# cloud-provider-kind

[cloud-provider-kind](https://github.com/kubernetes-sigs/cloud-provider-kind)
is a plugin that brings **native `LoadBalancer` support** to KinD clusters.

It monitors `Service` resources of type `LoadBalancer` and automatically
assigns them an IP address — just like a real cloud provider would.

```sh
brew install cloud-provider-kind

# Run in a separate terminal while the cluster is up:
sudo cloud-provider-kind
```

* No special cluster config required
* Works with any standard Ingress Controller
* On Podman/Docker Desktop (macOS/Windows): automatically enables
  `--enable-lb-port-mapping` for `localhost` access
* Testing experience is **much closer to a real cluster**

---

# New KinD setup

Four simple steps — no custom cluster config needed:

```sh {1|2-3|4-6|7-9}
# 1. Create a plain KinD cluster
kind create cluster

# 2. Install and run cloud-provider-kind (keep running in background)
brew install cloud-provider-kind
sudo cloud-provider-kind

# 3. Install Traefik (standard Helm install)
helm upgrade --install traefik traefik/traefik \
  --set providers.kubernetesIngressNginx.enabled=true \
  --namespace traefik --create-namespace

# 4. Verify LoadBalancer IP assigned and Traefik is ready
kubectl get svc -n traefik
```

Traefik's LoadBalancer gets a real IP — browse it directly or set `/etc/hosts`.

---
layout: section
---

# Part 4
## Traefik on Docker Compose

---

# Traefik arrived in Compose first

While the Helm migration happened in March 2026, **Traefik was already the
proxy in our Docker Compose bundles** for both Community and Enterprise.

This is part of a **broader modernization effort** across all deployment
environments:

| Environment | Before | After |
|---|---|---|
| Docker Compose | nginx (custom image) | **Traefik** ✅ |
| Kubernetes (Helm) | ingress-nginx | **Traefik** ✅ |
| KinD local dev | ingress-nginx (special build) | **Traefik** ✅ |

<br>

Consistent reverse proxy across all environments → simpler mental model,
unified configuration patterns.

---

# How Traefik works in Compose

No separate config file. Routing is driven by **Docker labels** on each service.

```yaml
services:
  alfresco:
    image: quay.io/alfresco/alfresco-content-repository:latest
    labels:
      - "traefik.http.routers.alfresco.rule=PathPrefix(`/alfresco`)"
      - "traefik.http.middlewares.limit.buffering.maxRequestBodyBytes=5368709120"
      - "traefik.http.routers.alfresco.middlewares=limit"

  proxy:
    image: traefik:v3
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.transport.respondingTimeouts.readTimeout=1200"
```

* Labels are **evaluated live** — no restart needed for routing changes
* Upload limits and timeouts configured via labels on each service

---

# Compose `extends` feature

We now leverage Docker Compose's
[extends](https://docs.docker.com/compose/how-tos/multiple-compose-files/extends/)
feature to improve maintainability.

```
docker-compose/
├── commons/          ← shared base definitions (Traefik, networks, …)
├── compose.yaml      ← Enterprise (extends commons)
├── community-compose.yaml
├── 23.N-compose.yaml
└── solr6-overrides.yaml
```

**Important**: compose files must be invoked **from within** the
`docker-compose/` directory:

```sh
cd docker-compose
docker compose up -d

# NOT from the repo root — relative extends paths will break
```

Customizations should extend the files in `commons/` rather than copy-pasting
service definitions.

---
layout: section
---

# Part 5
## ActiveMQ Authentication (ACS 26+)

---

# ActiveMQ auth enabled by default

Starting with **ACS 26**, the `alfresco-activemq:6.2.x` image enables
authentication by default. This applies to **both Compose and Helm**.

**On the broker** (`alfresco-activemq` service / chart):

```yaml
ACTIVEMQ_ADMIN_LOGIN: admin
ACTIVEMQ_ADMIN_PASSWORD: <your-password>
```

**On every service that connects to ActiveMQ**:

```yaml
SPRING_ACTIVEMQ_USER: admin
SPRING_ACTIVEMQ_PASSWORD: <your-password>
```

Affected services: `alfresco-repository`, `transform-router`,
`transform-core-aio`, `alfresco-sync-service`, `search-enterprise`

<br>

> Older `alfresco-activemq` images (pre-6.2.x) remain unauthenticated by
> default for backwards compatibility.

---
layout: section
---

# Part 6
## Summary

---

# What do you need to do?

<br>

**Kubernetes / Helm**

* Uninstall ingress-nginx, install Traefik with `providers.kubernetesIngressNginx.enabled=true`
* No changes to existing `Ingress` resources needed
* For existing clusters: follow the zero-downtime migration guide

**KinD (local dev)**

* Drop the custom cluster config
* Use `kind create cluster` + `cloud-provider-kind`
* Install Traefik normally

**Docker Compose**

* Already on Traefik — nothing to do on the proxy side
* If on ACS 26+: add ActiveMQ credentials to all affected services
* Run compose files from within the `docker-compose/` directory

---

# The bigger picture

This is not just a swap of one reverse proxy for another.

It's a **consistent modernization** across every Alfresco deployment surface:

```
Docker Compose  ──┐
                  ├── Traefik everywhere
Kubernetes/Helm ──┤
                  │
KinD (local) ─────┘
```

* One mental model for routing configuration
* One set of documentation and debugging skills
* Actively maintained, cloud-native tooling
* Foundation for future improvements: Gateway API, Traefik middlewares, mTLS

<br>

> The migration from ingress-nginx to Traefik is complete for new deployments.
> Existing clusters can migrate with zero downtime.

---

# Questions?

Reach me on LinkedIn: [Giovanni Toraldo](https://www.linkedin.com/in/giovannitoraldo/)

or on my website [gionn.net](https://gionn.net)

Slides sources on GitHub: [github.com/gionn/ingress-nginx-traefik](https://github.com/gionn/ingress-nginx-traefik)
