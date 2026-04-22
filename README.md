# From ingress-nginx to Traefik

Modernizing Alfresco reverse proxy across helm and docker compose.

Alfresco is moving from ingress-nginx to Traefik for Helm deployments, bringing
a more modern and maintainable approach to reverse proxying in acs-deployment.
This presentation gives an overview of the change, the new Traefik guidance for
Kubernetes, and the compatibility choices that still matter during the
transition. It also looks at KinD deployments, where cloud-provider-kind makes
local testing much closer to a real cluster.

It also connects this change with the earlier introduction of Traefik in Docker
Compose for both Community and Enterprise deployments, showing a broader effort
to modernize Alfresco deployment across environments.

While technical, this session will also be useful for beginners.

## How to run the presentation

To start the slide show:

- `npm install`
- `npm run dev`
- visit <http://localhost:3030>

Source of truth for the presentation is the [slides.md](./slides.md) file.

Learn more about Slidev at the [official documentation](https://sli.dev/).
