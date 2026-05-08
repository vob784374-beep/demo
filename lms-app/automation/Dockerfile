FROM node:20-alpine

WORKDIR /app

# Install Playwright and dependencies
RUN npm install -g @playwright/test@latest

# Copy test files
COPY . .

# Install project dependencies
RUN npm install

# Install browsers
RUN npx playwright install --with-deps chromium

CMD ["npx", "playwright", "test"]