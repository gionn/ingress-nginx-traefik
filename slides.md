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

---


---

# Questions?

Reach me on LinkedIn: [Giovanni Toraldo](https://www.linkedin.com/in/giovannitoraldo/)

or on my website [gionn.net](https://gionn.net)

Slides sources on GitHub: [github.com/gionn/ingress-nginx-traefik](https://github.com/gionn/ingress-nginx-traefik)
