# Studio Production Tech Stack

Kolibri Studio is primarily Python+Django app, storing user data on PostgreSQL and content
on to Google Cloud Storage. Almost the entire user request-response lifecycle is hosted on
Google Cloud Platform. The DNS records are hosted on CloudFlare. CloudFlare also acts as our
primary reverse proxy, doing basic caching on content, and protecting against DDoS attacks.

## Production Architecture

!(architecture)[prod-architecture.png]

### CloudFlare

CloudFlare acts as our primary reverse proxy, DNS nameserver, and DDoS protection.
It performs the following tasks:

- Hosts all our DNS records. Although NameCheap is our primary registrar, CloudFlare is our
nameserver, hosting all of our DNS entries. Making CloudFlare our nameserver is necessary for
the rest of the features to be activated.
- For certain websites, CloudFlare can act as a reverse proxy, hiding our primary servers' IP addresses,
as well as turning on all the other features discussed below.
- DDoS protection. Once CloudFlare proxies on behalf of a website, it can automatically block IP addresses
that appear to come from Distributed Denial of Service attacks (DDoS).
- CloudFlare, by default, caches static assets on their global CDN. See [here](https://support.cloudflare.com/hc/en-us/articles/200172516-Which-file-extensions-does-Cloudflare-cache-for-static-content-)
for the list of file extensions that CloudFlare caches by default. In addition to these, we cache everything under
Studio's `/content/storage/` path.
- CloudFlare also hosts our organization's SSL certificate, and provides SSL termination for all applications reverse-proxied
through CloudFlare. For certain websites (Studio and LE's main website),
CloudFlare also redirects plain HTTP redirects to HTTPS.

What can I debug with CloudFlare:
- DNS issues
- SSL termination for CloudFlare proxied apps
- Caching issues

### Kubernetes

Kubernetes is the primary containerization platform we use for Studio. It's a complex beast, but by conforming Studio to its
expected format and having a Docker image as the primary deployment artifact, we gain the following:

- Live health and readiness checks. Kubernetes does not redirect traffic to containers until a container passes readiness checks
defined by the operator. It also automatically restarts containers that fails health checks, suddenly crashes, or exceeds
defined memory and I/O limits.
- Automated deployment upgrades. Kubernetes carefully migrating app containers one by one until all running containers are upgraded. This ties
with readiness checks, making for a basic 'canary' process, where Kubernetes stops a deployment upgrade from continuing if the new
container fails the readiness check.
- Container packing and scheduling. Kubernetes looks at a container's resource requests (CPU, memory, I/O), and allocates them to VMs that
have the available resources requested, as well as grouping together containers that are working closely together.
- Secret management. Kubernetes allows operators to define production secrets, and mount them in containers either as actual files to be read,
or as environment variables.

Kubernetes exposes two implementation details for its operators:
- The Kubernetes master. This is the main server operators talk to for almost everything. Since we use Google Kubernetes Engine, this is managed
100% by Google and their SREs.
- The Nodes. These are VMs allocated by Google for our containers. There is a Kubernetes agent installed on each one, and the master communicates
with each agent, and allocates containers to each one depending on resources available. This is what we pay for.

To deploy to Kubernetes, we first build Studio into Docker images. We then send a YAML file to the Kubernetes master, describing:
- what images to pull
- how to run them (e.g. use the Studio image as both the web server and as a worker)
- how many replicas of each container to run
- what environment variables to put in, or what disks and secrets to mount for each container
- the health and readiness checks for each container
- how to route each request to each running container, based on either the hostname, or the path

What you can do and debug with Google Kubernetes Engine operator and Google Cloud Platform access:
- 502 gateway timeout errors (If a studio container fails to respond within 1 minute, CloudFlare returns this)
- request routing issues (Kubernetes and Traefik jointly handle request routing)
- caching issues (if the internal nginx proxy is misconfigured, it may start caching assets and content. But that rarely happens)
- Python error issues (A common thing! Look straight to the different studio pods)
- publishing issues (Happens with the whole Celery and worker machinery, and that breaks down often)
- request or header issues (there's an internal nginx proxy that may mess with headers)
- /content/* routing issues (the internal nginx proxy directly passes the request to Google Cloud Storage, and bypasses the app)
- static asset issues (the internal nginx proxy serves the assets)
- database issues
- emailing issues (when Studio stops emailing users, make sure to look here)
- pretty much anything that studio has access to -- from the DB, to the request-response cycle after proxies, to the redis servers

### Traefik Proxy

Google Cloud Platform has native load balancers. Unfortunately, these are expensive ($25), can only host one app version per load balancer,
and are finicky to set up. This is detrimental to having a variable amount of servers spawned at any one time (a goal when we want to spawn
a identical copies of Studio), and will lead to runaway costs.

To get around this, we instantiate our own internal load balancer, and then point an allocated GCP static address. Traefik here acts as a secondary
proxy, selecting the right studio instance based on the hostname header in the request. Traefik runs on our Kubernetes cluster, and has all the guarantees
provided by Kubernetes.

Traefik also has built in Let's Encrypt support. For any hostnames we declare on our Kubernetes YAML manifests, Traefik fetches Let's Encrypt
certificates for each of them, integrating with CloudFlare to automatically pass the Let's Encrypt challenge. You can verify this by looking
at [the staging server's SSL certificate](https://develop.studio.learningequality.org).

On our production cluster, we run both the [staging instance](https://develop.studio.learningequality.org), and
[the production instance](https://studio.learningequality.org) of Studio. Using Traefik as our main gateway proxy allows us to run both instances
transparently within the same cluster, for minimal cost.

What you can debug knowing Traefik is here
- wrong or missing headers (Traefik is another proxy that may muck with our headers, it has happened before already)
- non-CloudFlare proxied SSL issues (Traefik hosts the Let's Encrypt SSL certificates)
- 502 Gateway timeout errors (this happens when Traefik doesn't have enough memory)

### Redis

Along with the rest of Studio code, we deploy an internal Redis server that acts Celery's messaging system between
the app container (caller of asynchronous code) and the worker (running said asynchronous code). This is currently used
for publishing code, which in its current state can take more than 8 hours to run.

There is no special configuration inserted into Redis, aside from a High Availability configuration that's provided out of
the box.

Issues you can debug with Redis:
- publishing issues
- Celery

### Google Cloud Storage

Google Cloud Storage (GCS) is GCP's object storage system, able to host and serve files with many nines of reliability. Objects stored
in here are organized around "buckets". Objects are also assigned a storage class, which describe how they are stored across Google's
servers.

We host all of Studio's content storage and databases (hereby referred to as "content") in a bucket called `studio-content`.
All of the objects here are by default set to `Multi-Regional` storage class, distributing our objects across multiple
data centers within the Central US. This adds resiliency to our content. We also mark all content as publicly readable by default,
which means that anyone can download a piece of content, if they know our bucket (which is public anyway) and the hash of the content.
This makes it easy for Studio to share a direct link to the content hosted on GCS, without sending an expiring link. By sharing
said direct public link, we save bandwidth on our side, while allowing Google's global CDN to kick in and serve that content within
the user's geographic region.

The code to upload to GCS is bespoke and custom-made for Studio. Note that though content storage itself can be cached almost forever
by CDNs, we have to take special care that the content databases aren't cached by GCS, nginx, traefik, or CloudFlare for that matter.
To make sure GCS doesn't cache publicly readable objects (its default behaviour), make sure to set the `Cache-Control` property of
`studio-content/databases` objects to `private`.

Look into the special GCS storage code, or on our GCS bucket itself, for these issues:
- content uploading issues
- content permissions (they should be publicly readable by anyone!)
- content caching issues

### Google Cloud SQL

We host our user data on Google Cloud SQL, a hosted PostgreSQL database.


## Miscellaneous services

### Newrelic

### Sentry.io


