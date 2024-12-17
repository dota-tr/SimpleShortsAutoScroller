let autoScrollEnabled = false;
let menuCreated = false;

const SELECTORS = {
    VIDEO: "#shorts-player>div>video",
    VIDEO_CONTAINER: "#shorts-player > div.html5-video-container > video",
    NEXT_BUTTON: "#navigation-button-down > ytd-button-renderer > yt-button-shape",
    REEL_RENDERER: "ytd-reel-video-renderer",
    MENU: '.shorts-auto-scroll-menu'
};

const cache = {
    video: null,
    nextButton: null,
    lastVideoTime: 0,
    clearCache: () => {
        cache.video = null;
        cache.nextButton = null;
        cache.lastVideoTime = 0;
    }
};

//----------------------------------VIDEO----------------------------------
function getCurrentId() {
    const video = getVideo();
    if (!video) return null;
    
    const closest = video.closest(SELECTORS.REEL_RENDERER);
    return closest?.id ? +closest.id : null;
}

function getVideo() {
    if (!cache.video) {
        cache.video = document.querySelector(SELECTORS.VIDEO);
    }
    return cache.video;
}

function getNextButton() {
    if (!cache.nextButton) {
        cache.nextButton = document.querySelector(SELECTORS.NEXT_BUTTON);
    }
    return cache.nextButton;
}

function checkVideoState() {
    const video = getVideo();
    if (!video) return { isPlaying: false, hasEnded: false };
    
    const currentTime = video.currentTime;
    const duration = video.duration;
    
    if (Math.abs(currentTime - cache.lastVideoTime) > 1) {
        cache.clearCache();
    }
    cache.lastVideoTime = currentTime;
    
    return {
        isPlaying: currentTime > 0.5 && duration > 1,
        hasEnded: currentTime >= (duration - 0.25)
    };
}

function skipShort() {
    getNextButton()?.click();
}

function scrollToNextVideo() {
    if (!autoScrollEnabled) return;
    
    const { isPlaying, hasEnded } = checkVideoState();
    if (hasEnded && isPlaying) {
        skipShort();
    }
}

//----------------------------------MENU----------------------------------
function createToggleMenu() {
    if (menuCreated) return;

    const menu = document.createElement('div');
    menu.className = 'shorts-auto-scroll-menu';
    menu.innerHTML = `
        <span>Auto Scroll</span>
        <label class="toggle-switch">
            <input type="checkbox" id="autoScrollToggle">
            <span class="toggle-slider"></span>
        </label>
    `;

    document.body.appendChild(menu);
    
    const toggleElement = document.getElementById('autoScrollToggle');
    if (toggleElement) {
        chrome.storage.local.get(['autoScrollEnabled'], ({autoScrollEnabled: enabled}) => {
            autoScrollEnabled = enabled || false;
            toggleElement.checked = autoScrollEnabled;
            
            toggleElement.addEventListener('change', e => {
                autoScrollEnabled = e.target.checked;
                chrome.storage.local.set({ autoScrollEnabled });
            });
        });
    }

    menuCreated = true;
}

function removeExistingMenu() {
    const existingMenu = document.querySelector(SELECTORS.MENU);
    if (existingMenu) {
        existingMenu.remove();
        menuCreated = false;
    }
}

function isShortsPage() {
    return window.location.pathname.includes('/shorts/');
}

function initializeMenu() {
    if (!isShortsPage()) {
        removeExistingMenu();
        return;
    }

    if (!document.querySelector(SELECTORS.MENU)) {
        createToggleMenu();
    }
}

function handlePageChange() {
    if (!isShortsPage()) {
        removeExistingMenu();
        menuCreated = false;
        return;
    }
    initializeMenu();
}

//--------------------------------------------------------------------
function setupEventListeners() {
    window.addEventListener('popstate', handlePageChange);
    window.addEventListener('load', handlePageChange);
    
    document.addEventListener('timeupdate', (e) => {
        if (e.target.tagName === 'VIDEO' && isShortsPage()) {
            scrollToNextVideo();
        }
    }, true);
    
    document.addEventListener('loadedmetadata', () => cache.clearCache(), true);
}

const observer = new MutationObserver((mutations) => {
    if (!isShortsPage()) {
        removeExistingMenu();
        menuCreated = false;
    } else {
        initializeMenu();
    }
});

observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    characterData: true
});
setupEventListeners();
initializeMenu();