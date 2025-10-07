(() => {
  const defaults = {
    processedAttr: 'data-cdn-processed',
    providers: {
      '0': (user, repo, commit, path) =>
        `https://cdn.jsdelivr.net/gh/${encodeURIComponent(user)}/${encodeURIComponent(repo)}@${encodeURIComponent(commit)}/${path.replace(/^\//, '')}`,
      '1': (user, repo, commit, path) =>
        `https://cdn.statically.io/gh/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/${encodeURIComponent(commit)}/${path.replace(/^\//, '')}`
    },
    api: {
      commit: (user, repo, ref) =>
        `https://api.github.com/repos/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}`,
      latest: (user, repo) =>
        `https://api.github.com/repos/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/commits?per_page=1`,
      headers: {
        'Accept': 'application/vnd.github+json',
        'X-Requested-With': 'cdns',
        'User-Agent': 'cdns-loader'
      }
    }
  };

  const commitcahe = new Map();

  /** @param {string} spec */
  function parseSpec(spec) {
    if (!spec || typeof spec !== 'string') return null;

    const parts = spec.trim().split(/\s+/);
    if (parts.length === 0) return null;

    const [repoPath, ...paramPairs] = parts;
    const [user, repo, ...pathParts] = repoPath.split('/');

    if (!user || !repo) return null;

    let path = pathParts.join('/');
    const params = {};

    paramPairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) params[key] = value;
    });

    if (path.startsWith('blob/')) {
      const segments = path.split('/');
      if (segments.length >= 3) {
        if (!params.ref) params.ref = segments[1];
        path = segments.slice(2).join('/');
      }
    }

    return { user, repo, path, params };
  }

  function getattr(element) {
    const tag = element.tagName.toLowerCase();
    if (tag === 'link') return 'href';
    return 'src' in element ? 'src' : 'href' in element ? 'href' : null;
  }

  /** @param {string} user @param {string} repo @param {Object} params */
  async function resolveCommit(user, repo, params) {
    if (params?.sha) return params.sha;

    const ref = params?.ref || null;
    const cacheKey = `${user}/${repo}::${ref || 'latest'}`;

    if (commitcahe.has(cacheKey)) return commitcahe.get(cacheKey);

    const url = ref
      ? defaults.api.commit(user, repo, ref)
      : defaults.api.latest(user, repo);

    const promise = fetch(url, { headers: defaults.api.headers })
      .then(r => {
        if (!r.ok) throw new Error(`GitHub API ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (Array.isArray(data)) return data[0]?.sha || '';
        return data?.sha || '';
      })
      .catch(() => '');

    commitcahe.set(cacheKey, promise);
    return promise;
  }

  /** @param {HTMLElement} element */
  async function processElement(element) {
    if (!element || element.getAttribute(defaults.processedAttr)) return;

    const spec = element.getAttribute('cdn');
    const parsed = parseSpec(spec);
    if (!parsed) return;

    const commit = await resolveCommit(parsed.user, parsed.repo, parsed.params);
    const commitOrRef = commit || parsed.params?.ref || 'main';

    const attr = getattr(element);
    if (!attr) return;

    const provider = parsed.params?.lg || '0';
    const url = defaults.providers[provider](parsed.user, parsed.repo, commitOrRef, parsed.path);
    const tag = element.tagName.toLowerCase();

    if (tag === 'script' && element.parentNode) {
      const clone = document.createElement('script');

      Array.from(element.attributes).forEach(({ name, value }) => {
        if (!['cdn', defaults.processedAttr, 'src', 'href'].includes(name)) {
          clone.setAttribute(name, value);
        }
      });

      clone.setAttribute(attr, url);
      clone.setAttribute(defaults.processedAttr, '1');
      element.parentNode.replaceChild(clone, element);
    } else {
      element.setAttribute(attr, url);
      element.setAttribute(defaults.processedAttr, '1');
      element.removeAttribute('cdn');
    }
  }

  function processcurrent() {
    document.querySelectorAll('[cdn]').forEach(processElement);
  }

  function observe() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'cdn' && mutation.target?.nodeType === 1) {
          processElement(mutation.target);
        }

        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              if (node.hasAttribute?.('cdn')) processElement(node);
              node.querySelectorAll?.('[cdn]').forEach(processElement);
            }
          });
        }
      });
    });

    observer.observe(document.documentElement || document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['cdn']
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      processcurrent();
      observe();
    });
  } else {
    processcurrent();
    observe();
  }
})();
