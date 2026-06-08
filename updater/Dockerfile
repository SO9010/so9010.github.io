FROM node:22-alpine

RUN apk add --no-cache git

COPY entrypoint.sh generate-blogs.js /
RUN chmod +x /entrypoint.sh

# Where the served clone lives (shared volume, mounted by compose).
ENV SITE_DIR=/site
WORKDIR /site

ENTRYPOINT ["/entrypoint.sh"]
