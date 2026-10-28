# Fortune Cookie — developer & release shortcuts.
#
#   make install   Install dependencies (npm ci)
#   make dev       Local dev server (http://localhost:5173)
#   make build     Production build to dist/
#   make test      Unit + integration tests (Vitest)
#   make lint      ESLint + Prettier check
#   make content   Regenerate + validate the fortune library
#   make clean     Remove build/test artifacts
#   make distclean clean + remove node_modules
#   make release   Validated production build + timestamped deploy tarball
#
# make (no target) = build.

SHELL := /bin/bash
DATE  := $(shell date +%Y%m%d-%H%M%S)
DIST  := dist
OUT   := releases

.PHONY: all install dev build test test-e2e lint format content validate icons clean distclean release help

all: build

# Install deps once; re-runs when the lockfile changes.
node_modules/.installed: package.json package-lock.json
	npm ci --no-audit --no-fund
	touch $@

install: node_modules/.installed

dev: install
	npm run dev

build: install
	npm run build

test: install
	npm test

test-e2e: install build
	npx playwright install chromium --with-deps 2>/dev/null || npx playwright install chromium
	npm run test:e2e

lint: install
	npm run lint

format: install
	npm run format

# Regenerate fortune JSON from seeds, then run the hard validation gate.
content: install
	npm run generate:fortunes

validate: install
	npm run validate:fortunes

clean:
	rm -rf $(DIST) playwright-report test-results content-report.json
	rm -f $(OUT)/*.tar.gz 2>/dev/null || true

distclean: clean
	rm -rf node_modules

icons: install
	npm run build:icons

# release: full gate (seeds → generated content → validation → icons → build)
# then package dist/ as a timestamped tarball ready to ship to a VPS.
release: install content validate icons build
	@mkdir -p $(OUT)
	tar -czf $(OUT)/fortune-cookie-$(DATE).tar.gz -C $(DIST) .
	@echo
	@echo "Release ready: $(OUT)/fortune-cookie-$(DATE).tar.gz"
	@echo "Deploy: scp the tarball to the VPS, extract into a new releases/ dir,"
	@echo "and repoint the 'current' symlink (see README)."

help:
	@grep -E '^#   make ' Makefile | sed 's/^#   //'
