---
theme: default
background: https://images.unsplash.com/photo-1504275107627-0c2ba7a43dba?q=80&w=1365&auto=format&fit=crop
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
hideInToc: true
---
# From ingress-nginx to Traefik

Giovanni Toraldo

Hyland

---
layout: image-right
image: https://avatars.githubusercontent.com/u/71768
hideInToc: true
---

# About me

* DevOps Engineer at Hyland
* Reenactor during the weekends
* More about me on [gionn.net](https://gionn.net)

---
hideInToc: true
---

# Ops readiness team

My team ensures that Alfresco can be deployed and operated reliable in multiple
environments. We focus on:

* Helm charts and GitOps best practices
* Docker images and Compose for local development
* CI/CD pipelines and automation
* Performance testing and monitoring 🆕

---
hideInToc: true
---

# Open source projects we maintain

* Containerized deployments:
  * [acs-deployment](https://github.com/Alfresco/acs-deployment) umbrella Helm
    chart for the whole stack and compose files for local development
  * [alfresco-helm-charts](https://github.com/Alfresco/alfresco-helm-charts):
    component-level charts for more flexibility
  * [alfresco-dockerfiles-bakery](https://github.com/Alfresco/alfresco-dockerfiles-bakery):
    build your own Docker images with customizations
* Classic deployment:
  * [alfresco-ansible](https://github.com/Alfresco/alfresco-ansible-deployment):
    Ansible playbooks for on-premises/VM deployments

---
hideInToc: true
---

# Table of contents

<Transform :scale="0.9">
<Toc minDepth="1" maxDepth="1"/>
</Transform>

---
layout: section
---

# The Problem: ingress-nginx deprecation

## Part 1

---
hideInToc: true
---

# What is an Ingress Controller?

An **Ingress Controller** is a Kubernetes component that manages external HTTP/HTTPS
access to services inside a cluster.

It watches for `Ingress` resources and sets up a reverse proxy accordingly.

```text
Internet → LoadBalancer → Ingress Controller → Services → Pods
```

* Routes traffic based on hostnames and paths
* Handles TLS termination
* Can enforce rate limits, auth, redirects, …

> Without an Ingress Controller installed, `Ingress` resources have no effect.

---
hideInToc: true
---

# ingress-nginx is retired

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
>

---
hideInToc: true
---

# Ingress is not going away

The `Ingress` API is still part of Kubernetes and will continue to be supported.

The `Gateway` API is also emerging as a more powerful and flexible alternative,
but adoption is still in early stages.

The key point is that **the deprecation only affects the ingress-nginx
controller** — not the Ingress API itself - a lot of people are missing this
nuance.

---
hideInToc: true
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

# Traefik on Kubernetes

## Part 2

---
hideInToc: true
---

# Why Traefik?

[Traefik](https://traefik.io/) is a modern, cloud-native reverse proxy and
Ingress Controller actively maintained by Traefik Labs.

* Supports standard Kubernetes `Ingress` resources (and its own CRD
  `IngressRoute`)
* Built-in dashboard, metrics, tracing, access logs
* Actively developed, well-documented, widely adopted
* Provides a compatibility mode for ingress-nginx annotations

Our charts use **standard `Ingress` resources** for broad compatibility — no
CRD migration required - except for a few nginx-specific annotations.

---
hideInToc: true
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

* Enabling `kubernetesIngressNginx` provider tells Traefik to watch `Ingress`
  resources with `ingressClassName: nginx` and provides compatibility with
  existing ingress-nginx annotations.

---
hideInToc: true
---

## Charts Backward Compatibility

Our latest charts provides `global.ingressClassName: nginx` as default —
**existing deployments continue to work** with the current `Ingress` resources.

Optional fine-grained control via component chart values:

* `.ingress.className`: override the IngressClass name
* `.ingress.annotations`: add more controller-specific annotations
* `.ingress.enabled: false`: disable bundled Ingress to bring your own

---
hideInToc: true
---

## The nginx ingressClass must still be present

It's critical to keep the `nginx` `IngressClass` resource in the cluster, even
after uninstalling ingress-nginx, otherwise Traefik won't pick up any `Ingress`
resources.

```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx
spec:
  controller: k8s.io/ingress-nginx
```

---
hideInToc: true
---

## Migrating an existing cluster

Zero-downtime strategy from the [official Traefik guide](https://doc.traefik.io/traefik/migrate/nginx-to-traefik/):

### Steps (diagram on next slide)

1. Install Traefik **alongside** NGINX (both serve traffic)
2. Verify Traefik handles your Ingresses via its own LoadBalancer IP (e.g. edit
   your `/etc/hosts` to point to Traefik's IP)
3. Add Traefik IP to DNS — progressive traffic shift
4. Remove NGINX IP from DNS, wait for propagation
5. Uninstall NGINX - delete admission webhook if installed without Helm
6. Ensure `nginx` `IngressClass` is still present

---
hideInToc: true
---

## Upgrade strategy

```text {1-2|4-6|8-10|12-13|all}
Before:
  DNS → NGINX LB → Services

After Traefik installed:
  DNS → NGINX LB   → Services
      → Traefik LB → Services

After DNS shift:
  DNS → Traefik LB → Services
        NGINX LB   → Services (draining)

After NGINX uninstall:
  DNS → Traefik LB → Services
```

---
layout: section
---

# KinD Improvements

## Part 3

---
layout: image-right
image: https://kind.sigs.k8s.io/logo/logo.png
backgroundSize: 15em
hideInToc: true
---

# What is KinD?

[KinD](https://kind.sigs.k8s.io/) is a tool for running Kubernetes clusters
locally using just a Docker runtime.

It's widely used for local development and testing on the CI.

Successor of Minikube or any other native local Kubernetes solution (e.g.
Rancher Desktop, Docker Desktop Kubernetes).

---
hideInToc: true
---

# The old ingress-nginx on KinD

Running ingress-nginx on KinD required a custom cluster configuration exposing
host http/s ports:

<Transform :scale="0.6">
```shell {all|12-16}
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
</Transform>

---
hideInToc: true
---

# Problems with the old approach

* Ports 80 and 443 must be **free on the host**
* Requires a **patched ingress-nginx manifest** for KinD
* Cluster config is tightly coupled to the ingress controller
* Not really representative of a real Kubernetes environment

---
hideInToc: true
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

---
hideInToc: true
---

# Benefits of cloud-provider-kind

* No special KinD cluster config required
* Works with any standard Ingress Controller
* On Podman/Docker Desktop (macOS/Windows): automatically enables
  `--enable-lb-port-mapping` for `localhost` access
* Ingress testing experience is **much closer to a real cluster**

---
hideInToc: true
---

# New KinD setup

Four simple steps — no custom cluster config needed:

```sh {1-2|4-5|7-10|12-13|all}
# 1. Create a plain KinD cluster
kind create cluster

# 2. Install and run cloud-provider-kind (keep running in background)
sudo cloud-provider-kind

# 3. Install Traefik (standard Helm install)
helm upgrade --install traefik traefik/traefik \
  --set providers.kubernetesIngressNginx.enabled=true \
  --namespace traefik --create-namespace

# 4. Verify LoadBalancer IP assigned and Traefik is ready
kubectl get svc -n traefik
```

---
layout: section
---

# Live Demo

## Part 4

---
layout: section
---

# Traefik on Docker Compose

## Part 5

---
layout: image-right
image: /images/docker-compose.png
backgroundSize: 15em
hideInToc: true
---

# Traefik in Compose

While the Helm migration happened in March 2026, **Traefik was already the proxy
in our Docker Compose bundles** for both Community and Enterprise since late
2024.

A single reverse proxy across all environments → simpler mental model, unified
configuration patterns.

---
hideInToc: true
---

# How Traefik works with Compose

* No separate config file.
* Routing is driven by **Docker labels** on each service.
  * Labels are **evaluated live** by Traefik - no need to restart the proxy,
    just the service being routed.
  * Configure every aspect of routing, middleware, limit, TLS, etc. via labels

```yaml
services:
  alfresco:
    image: quay.io/alfresco/alfresco-content-repository:26.1.0
    labels:
      - "traefik.http.routers.alfresco.rule=PathPrefix(`/`)"
```

---
hideInToc: true
---

# Compose with Traefik: example

```yaml {1-3|1-8|10-15|all}
services:
  alfresco:
    image: quay.io/alfresco/alfresco-content-repository:26.1.0
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.alfresco.rule=PathPrefix(`/`)"
      - "traefik.http.middlewares.limit.buffering.maxRequestBodyBytes=5368709120"
      - "traefik.http.routers.alfresco.middlewares=limit@docker"

  proxy:
    image: traefik:v3
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:8080"
      - "--entrypoints.web.transport.respondingTimeouts.readTimeout=1200"
```

---
hideInToc: true
---

# Compose `extends` feature

We now leverage Docker Compose
[extends](https://docs.docker.com/compose/how-tos/multiple-compose-files/extends/)
feature to improve maintainability.

```text
docker-compose/
├── commons/               ← shared base definitions (Traefik labels, …)
├── compose.yaml           ← Enterprise which extends commons
├── community-compose.yaml ← Community which extends commons
├── 23.N-compose.yaml.     ← older supported versions
└── solr6-overrides.yaml   ← optional overrides for specific components
```

Customizations should be extensions in `commons` rather than copy-pasting
service definitions.

---
layout: section
---

# ActiveMQ Authentication (ACS 26+)

## Part 6

---
hideInToc: true
---

# ActiveMQ auth enabled by default

Starting with **ACS 26**, the `alfresco-activemq:6.2.x` image enables
authentication by default. This applies to **both Compose and Helm**.

Affected services: `alfresco-repository`, `transform-router`,
`transform-core-aio`, `alfresco-sync-service`, `search-enterprise`

Older `alfresco-activemq` images (pre-6.2.x) remain unauthenticated by default
for backwards compatibility.

---
hideInToc: true
---

# Configuring ActiveMQ credentials

**On the broker** (`alfresco-activemq` service / chart):

```yaml
ACTIVEMQ_ADMIN_LOGIN: admin
ACTIVEMQ_ADMIN_PASSWORD: <your-password>
```

**On every service that connects to ActiveMQ** (or similar properties depending
on the component):

```yaml
SPRING_ACTIVEMQ_USER: admin
SPRING_ACTIVEMQ_PASSWORD: <your-password>
```

---
layout: section
---

# Summary

## Part 7

---
hideInToc: true
---

## What do you need to do?

### Kubernetes / Helm

* Uninstall ingress-nginx, install Traefik with `providers.kubernetesIngressNginx.enabled=true`
* No changes to existing `Ingress` resources needed
* For existing clusters: follow the zero-downtime migration guide

---
hideInToc: true
---

## What do you need to do?

### KinD

* Drop the custom cluster config
* Use `kind create cluster` + `cloud-provider-kind`
* Install Traefik normally

---
hideInToc: true
---

## What do you need to do?

### Docker Compose

* Already on Traefik — nothing to do on the proxy side
* If on ACS 26+: add ActiveMQ credentials to all affected services
* Run compose files from within the `docker-compose/` directory

---
hideInToc: true
---

# The bigger picture

This is not just a swap of one reverse proxy for another.

It's a **consistent modernization** across every Alfresco deployment surface:

* One mental model for routing configuration
* One set of documentation and debugging skills
* Actively maintained, cloud-native tooling
* Foundation for future improvements: Gateway API, advanced traffic management

---
hideInToc: true
---

# Questions?

Reach me on LinkedIn: [Giovanni Toraldo](https://www.linkedin.com/in/giovannitoraldo/)

or on my website [gionn.net](https://gionn.net)

Slides sources on GitHub: [github.com/gionn/ingress-nginx-traefik](https://github.com/gionn/ingress-nginx-traefik)
