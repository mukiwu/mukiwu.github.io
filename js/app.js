/**
 * GitHub Portfolio - Main Application
 * Dynamically loads and displays GitHub Pages projects
 */

// Configuration
const CONFIG = {
  username: 'mukiwu',
  apiUrl: 'https://api.github.com/users',
  thumbnailService: 'https://image.thum.io/get/width/640/crop/400/',
  perPage: 100
};

// State
let allProjects = [];
let currentSort = 'updated';

// DOM Elements
const elements = {
  currentDate: document.getElementById('current-date'),
  greeting: document.getElementById('greeting'),
  totalRepos: document.getElementById('total-repos'),
  totalStars: document.getElementById('total-stars'),
  totalForks: document.getElementById('total-forks'),
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  projectsGrid: document.getElementById('projects-grid'),
  sortButtons: document.querySelectorAll('.sort-btn')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeDate();
  initializeGreeting();
  initializeSortButtons();
  loadProjects();
});

/**
 * Set current date in header
 */
function initializeDate() {
  const options = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };
  const date = new Date().toLocaleDateString('zh-TW', options);
  elements.currentDate.textContent = date;
}

/**
 * Set greeting based on time of day
 */
function initializeGreeting() {
  const hour = new Date().getHours();
  let greeting = '你好！';

  if (hour >= 5 && hour < 12) {
    greeting = '早安！';
  } else if (hour >= 12 && hour < 18) {
    greeting = '午安！';
  } else {
    greeting = '晚安！';
  }

  elements.greeting.textContent = greeting;
}

/**
 * Initialize sort button event listeners
 */
function initializeSortButtons() {
  elements.sortButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const sortType = btn.dataset.sort;
      if (sortType !== currentSort) {
        currentSort = sortType;
        elements.sortButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProjects(sortProjects(allProjects, sortType));
      }
    });
  });
}

/**
 * Fetch all repositories from GitHub API
 */
async function fetchAllRepos() {
  let allRepos = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `${CONFIG.apiUrl}/${CONFIG.username}/repos?per_page=${CONFIG.perPage}&page=${page}&sort=updated`
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const repos = await response.json();

    if (repos.length === 0) {
      hasMore = false;
    } else {
      allRepos = allRepos.concat(repos);
      page++;

      // Safety limit
      if (page > 10) hasMore = false;
    }
  }

  return allRepos;
}

/**
 * Load projects from GitHub API
 */
async function loadProjects() {
  showLoading();

  try {
    const repos = await fetchAllRepos();

    // Filter public repos that are not forks, have description and have website
    const publicRepos = repos.filter(repo =>
      !repo.fork && !repo.private && repo.description && repo.homepage
    );

    // Rename for consistency
    const ghPagesRepos = publicRepos;

    allProjects = ghPagesRepos;

    // Update stats
    updateStats(ghPagesRepos);

    // Sort and render
    const sorted = sortProjects(ghPagesRepos, currentSort);
    renderProjects(sorted);

    hideLoading();

  } catch (error) {
    console.error('Error loading projects:', error);
    showError();
  }
}

/**
 * Sort projects based on criteria
 */
function sortProjects(projects, sortType) {
  const sorted = [...projects];

  switch (sortType) {
    case 'stars':
      sorted.sort((a, b) => b.stargazers_count - a.stargazers_count);
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'updated':
    default:
      sorted.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      break;
  }

  return sorted;
}

/**
 * Update statistics display
 */
function updateStats(projects) {
  const totalStars = projects.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const totalForks = projects.reduce((sum, repo) => sum + repo.forks_count, 0);

  animateCounter(elements.totalRepos, projects.length);
  animateCounter(elements.totalStars, totalStars);
  animateCounter(elements.totalForks, totalForks);
}

/**
 * Animate counter from 0 to target
 */
function animateCounter(element, target) {
  const duration = 1000;
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * eased);

    element.textContent = current.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * Render projects to the grid
 */
function renderProjects(projects) {
  elements.projectsGrid.innerHTML = '';

  projects.forEach((project, index) => {
    const card = createProjectCard(project, index);
    elements.projectsGrid.appendChild(card);
  });
}

/**
 * Create a project card element
 */
function createProjectCard(repo, index) {
  const card = document.createElement('article');
  card.className = 'project-card';
  card.style.animationDelay = `${index * 50}ms`;

  // Determine if project has a demo URL
  let pagesUrl = null;
  let hasDemoUrl = false;

  // Check for homepage or GitHub Pages
  if (repo.homepage) {
    pagesUrl = repo.homepage;
    hasDemoUrl = true;
  } else if (repo.has_pages) {
    // Special case for username.github.io repo
    if (repo.name === `${CONFIG.username}.github.io`) {
      pagesUrl = `https://${CONFIG.username}.github.io/`;
    } else {
      pagesUrl = `https://${CONFIG.username}.github.io/${repo.name}/`;
    }
    hasDemoUrl = true;
  }

  // Generate thumbnail URLs
  // Priority: 1. screenshot.png in repo, 2. thum.io service
  const screenshotUrl = `https://raw.githubusercontent.com/${CONFIG.username}/${repo.name}/${repo.default_branch}/screenshot.png`;
  const thumbnailTarget = pagesUrl || repo.html_url;
  const fallbackThumbnailUrl = `${CONFIG.thumbnailService}${thumbnailTarget}`;

  // Get language color class
  const langClass = repo.language ? `lang-${repo.language.toLowerCase()}` : 'lang-default';

  // Format date
  const updatedDate = new Date(repo.updated_at).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Build demo button HTML only if there's a demo URL
  const demoButtonHtml = hasDemoUrl ? `
        <a href="${pagesUrl}" target="_blank" rel="noopener" class="action-btn" title="Live Demo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
        </a>
    ` : '';

  // Project name links to demo if available, otherwise to GitHub repo
  const projectLink = pagesUrl || repo.html_url;

  card.innerHTML = `
        <div class="project-thumbnail">
            <div class="thumbnail-loading">
                <div class="thumbnail-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <span>載入預覽中...</span>
                </div>
            </div>
            <img 
                src="${screenshotUrl}" 
                alt="${repo.name} preview"
                loading="lazy"
                data-fallback="${fallbackThumbnailUrl}"
                onload="this.previousElementSibling.style.display='none'"
                onerror="if(this.dataset.fallback && this.src !== this.dataset.fallback) { this.src = this.dataset.fallback; } else { this.style.display='none'; }"
            >
        </div>
        <div class="project-content">
            <div class="project-header">
                <h4 class="project-name">
                    <a href="${projectLink}" target="_blank" rel="noopener">${repo.name}</a>
                </h4>
                ${repo.language ? `
                    <span class="project-language">
                        <span class="language-dot ${langClass}"></span>
                        ${repo.language}
                    </span>
                ` : ''}
            </div>
            <p class="project-description">${repo.description || '暫無說明'}</p>
            <div class="project-meta">
                <span class="meta-item" title="Stars">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    ${repo.stargazers_count}
                </span>
                <span class="meta-item" title="Forks">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="18" r="3"></circle>
                        <circle cx="6" cy="6" r="3"></circle>
                        <circle cx="18" cy="6" r="3"></circle>
                        <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"></path>
                        <path d="M12 12v3"></path>
                    </svg>
                    ${repo.forks_count}
                </span>
                <span class="meta-item" title="最後更新">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    ${updatedDate}
                </span>
                <div class="project-actions">
                    <a href="${repo.html_url}" target="_blank" rel="noopener" class="action-btn" title="GitHub Repo">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                    </a>
                    ${demoButtonHtml}
                </div>
            </div>
        </div>
    `;

  return card;
}

/**
 * Show loading state
 */
function showLoading() {
  elements.loading.classList.remove('hidden');
  elements.error.classList.add('hidden');
  elements.projectsGrid.innerHTML = '';
}

/**
 * Hide loading state
 */
function hideLoading() {
  elements.loading.classList.add('hidden');
}

/**
 * Show error state
 */
function showError() {
  elements.loading.classList.add('hidden');
  elements.error.classList.remove('hidden');
}

// Expose loadProjects globally for retry button
window.loadProjects = loadProjects;

