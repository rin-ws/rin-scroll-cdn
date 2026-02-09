/**
 * RINscroll - Lightweight Scroll System
 * A modern, responsive vanilla JavaScript scroll library
 * @version 1.0.0
 */

(function(window, document) {
  'use strict';

  /**
   * RINscroll Constructor
   * @param {Object} options - Configuration options
   * @security Options should come from trusted sources only. Do not pass user-controlled 
   *           data (URL parameters, form inputs) directly to options without validation.
   */
  function RINscroll(options) {
    this.options = Object.assign({
      // Scroll snap configuration
      snapEnabled: true,
      snapDuration: 800,
      snapEasing: 'easeInOutCubic',
      
      // Section observer configuration
      sectionSelector: '[data-scroll-section]',
      threshold: 0.5,
      
      // Progress tracking
      progressBar: true,
      progressBarSelector: '.rinscroll-progress',
      sectionProgressBar: true,
      
      // Smooth scroll configuration
      smoothScroll: true,
      smoothScrollDuration: 600,
      smoothScrollOffset: 0,
      
      // Scroll direction
      horizontal: false,
      
      // Accessibility
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      keyboardNavigation: true,
      
      // Focus management
      focus: null,  // Can be { enabled: true, target: "section" | selector | function, preventScroll: true }
      
      // Callbacks
      onSectionEnter: null,
      onSectionLeave: null,
      onScrollProgress: null,
      
      // Lifecycle callbacks
      onFirstEnter: null,
      onReEnter: null,
      onFullyVisible: null,
      onSnapStart: null,
      onSnapEnd: null,
      
      // Mobile/touch configuration
      touchEnabled: true,
      momentumScroll: false,
      
      // Scroll to top configuration
      scrollToTop: null,  // Can be { target: '#selector' } or { ui: true, showAfter: 0.3, position: 'bottom-right' }
      
      // Scroll intent detection
      scrollIntent: {
        enabled: false,       // Disabled by default
        adaptiveSnap: true    // Adjust snap behavior based on intent
      }
    }, options || {});
    
    // Validate easing function name to prevent arbitrary property access
    this.validateEasingFunction();

    this.sections = [];
    this.currentSection = null;
    this.scrollDirection = null;
    this.lastScrollPosition = 0;
    this.eventListeners = [];
    this.scrollToTopButton = null;
    this.lastNavigationSource = null;  // Track if last navigation was via keyboard
    
    // Scroll intent detection state
    this.scrollIntent = {
      type: null,           // 'mouse', 'touch', 'trackpad'
      velocity: 0,          // Current scroll velocity
      isFlick: false,       // Whether current scroll is a fast flick
      lastScrollTime: 0,
      scrollSamples: []     // Store recent scroll samples for velocity calculation
    };
    
    this.init();
  }

  /**
   * Initialize the scroll system
   */
  RINscroll.prototype.init = function() {
    this.setupSections();
    this.setupObservers();
    this.setupProgressBars();
    this.setupSmoothScroll();
    this.setupScrollEvents();
    
    if (this.options.keyboardNavigation) {
      this.setupKeyboardNavigation();
    }
    
    if (this.options.touchEnabled) {
      this.setupTouchEvents();
    }
    
    if (this.options.scrollToTop) {
      this.setupScrollToTop();
    }
    
    if (this.options.scrollIntent && this.options.scrollIntent.enabled) {
      this.setupScrollIntentDetection();
    }
    
    // iOS fixes
    this.applyIOSFixes();
    
    // Reduced motion fallback
    if (this.options.reducedMotion) {
      this.disableAnimations();
    }
  };

  /**
   * Validate easing function name to prevent arbitrary property access
   * @security Whitelist validation for snapEasing option
   */
  RINscroll.prototype.validateEasingFunction = function() {
    var validEasings = [
      'linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad',
      'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
      'easeInQuart', 'easeOutQuart', 'easeInOutQuart',
      'easeInQuint', 'easeOutQuint', 'easeInOutQuint'
    ];
    
    if (validEasings.indexOf(this.options.snapEasing) === -1) {
      console.warn('RINscroll: Invalid easing function "' + this.options.snapEasing + '". Using default "easeInOutCubic".');
      this.options.snapEasing = 'easeInOutCubic';
    }
  };

  /**
   * Safe wrapper for querySelector to handle invalid selectors
   * @security Prevents errors from malformed CSS selectors
   * @param {string} selector - CSS selector string
   * @returns {Element|null} - Found element or null
   */
  RINscroll.prototype.safeQuerySelector = function(selector) {
    try {
      return document.querySelector(selector);
    } catch (e) {
      console.warn('RINscroll: Invalid selector "' + selector + '". Skipping.');
      return null;
    }
  };

  /**
   * Setup sections
   */
  RINscroll.prototype.setupSections = function() {
    var sectionElements = document.querySelectorAll(this.options.sectionSelector);
    var self = this;
    
    Array.prototype.forEach.call(sectionElements, function(element, index) {
      self.sections.push({
        element: element,
        index: index,
        id: element.id || 'section-' + index,
        isActive: false,
        progress: 0,
        state: 'upcoming',  // "upcoming" | "active" | "passed"
        hasEntered: false   // Track if section has been entered before
      });
    });
  };

  /**
   * Setup Intersection Observer for sections
   */
  RINscroll.prototype.setupObservers = function() {
    var self = this;
    
    var observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: [0, 0.25, 0.5, 0.75, 1.0]
    };
    
    this.observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var section = self.findSectionByElement(entry.target);
        
        if (!section) return;
        
        // Update section progress
        section.progress = entry.intersectionRatio;
        
        // Check if section is fully visible
        var isFullyVisible = entry.intersectionRatio >= 0.99;
        var wasFullyVisible = section.wasFullyVisible || false;
        
        // Update section state
        self.updateSectionState(section, entry);
        
        // Section enter/leave callbacks
        if (entry.isIntersecting && entry.intersectionRatio >= self.options.threshold) {
          if (!section.isActive) {
            section.isActive = true;
            self.currentSection = section;
            entry.target.classList.add('rinscroll-active');
            
            // Fire onFirstEnter or onReEnter
            if (!section.hasEntered) {
              section.hasEntered = true;
              if (self.options.onFirstEnter) {
                self.options.onFirstEnter(section, entry);
              }
            } else {
              if (self.options.onReEnter) {
                self.options.onReEnter(section, entry);
              }
            }
            
            // Legacy onSectionEnter callback
            if (self.options.onSectionEnter) {
              self.options.onSectionEnter(section, entry);
            }
          }
        } else {
          if (section.isActive) {
            section.isActive = false;
            entry.target.classList.remove('rinscroll-active');
            
            if (self.options.onSectionLeave) {
              self.options.onSectionLeave(section, entry);
            }
          }
        }
        
        // Fire onFullyVisible callback
        if (isFullyVisible && !wasFullyVisible) {
          section.wasFullyVisible = true;
          if (self.options.onFullyVisible) {
            self.options.onFullyVisible(section, entry);
          }
        } else if (!isFullyVisible && wasFullyVisible) {
          section.wasFullyVisible = false;
        }
        
        // Update section progress bars
        if (self.options.sectionProgressBar) {
          self.updateSectionProgress(section);
        }
      });
    }, observerOptions);
    
    // Observe all sections
    this.sections.forEach(function(section) {
      self.observer.observe(section.element);
    });
  };

  /**
   * Setup progress bars
   */
  RINscroll.prototype.setupProgressBars = function() {
    if (!this.options.progressBar) return;
    
    // Create global progress bar if it doesn't exist
    var progressBar = this.safeQuerySelector(this.options.progressBarSelector);
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'rinscroll-progress';
      
      // Create inner progress bar element (avoid innerHTML)
      var progressBarInner = document.createElement('div');
      progressBarInner.className = 'rinscroll-progress-bar';
      progressBar.appendChild(progressBarInner);
      
      document.body.appendChild(progressBar);
    }
    
    this.progressBar = progressBar;
    this.progressBarInner = progressBar.querySelector('.rinscroll-progress-bar');
  };

  /**
   * Setup smooth scroll for anchor links
   */
  RINscroll.prototype.setupSmoothScroll = function() {
    if (!this.options.smoothScroll) return;
    
    var self = this;
    var links = document.querySelectorAll('a[href^="#"]');
    
    Array.prototype.forEach.call(links, function(link) {
      link.addEventListener('click', function(e) {
        var href = this.getAttribute('href');
        if (href === '#') return;
        
        e.preventDefault();
        var target = self.safeQuerySelector(href);
        
        if (target) {
          self.scrollToElement(target);
        }
      });
    });
  };

  /**
   * Setup scroll event listeners
   */
  RINscroll.prototype.setupScrollEvents = function() {
    var self = this;
    var ticking = false;
    
    var scrollHandler = function() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          self.handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    // Mouse wheel handler - clears keyboard navigation flag
    var wheelHandler = function(e) {
      // User initiated mouse/trackpad scroll - clear keyboard flag
      self.lastNavigationSource = null;
    };
    
    window.addEventListener('scroll', scrollHandler);
    this.eventListeners.push({ element: window, event: 'scroll', handler: scrollHandler });
    
    window.addEventListener('wheel', wheelHandler, { passive: true });
    this.eventListeners.push({ element: window, event: 'wheel', handler: wheelHandler, options: { passive: true } });
    
    // Initial call
    this.handleScroll();
  };

  /**
   * Handle scroll events
   */
  RINscroll.prototype.handleScroll = function() {
    var currentPosition = this.options.horizontal 
      ? window.pageXOffset 
      : window.pageYOffset;
    
    // Don't reset navigation source during programmatic scroll
    // The keyboard flag will be cleared after focus management completes
    
    // Determine scroll direction
    if (currentPosition > this.lastScrollPosition) {
      this.scrollDirection = this.options.horizontal ? 'right' : 'down';
    } else if (currentPosition < this.lastScrollPosition) {
      this.scrollDirection = this.options.horizontal ? 'left' : 'up';
    }
    
    this.lastScrollPosition = currentPosition;
    
    // Update global progress bar
    if (this.options.progressBar && this.progressBarInner) {
      var scrollHeight = this.options.horizontal
        ? document.documentElement.scrollWidth - document.documentElement.clientWidth
        : document.documentElement.scrollHeight - document.documentElement.clientHeight;
      
      if (scrollHeight > 0) {
        var progress = Math.min((currentPosition / scrollHeight) * 100, 100);
        this.progressBarInner.style.width = progress + '%';
        
        if (this.options.onScrollProgress) {
          this.options.onScrollProgress(progress, currentPosition);
        }
      }
    }
    
    // Update scroll to top button visibility
    if (this.scrollToTopButton) {
      this.updateScrollToTopVisibility();
    }
  };

  /**
   * Setup keyboard navigation
   */
  RINscroll.prototype.setupKeyboardNavigation = function() {
    var self = this;
    
    var keydownHandler = function(e) {
      // Skip if reduced motion is enabled
      if (self.options.reducedMotion) return;
      
      // Mark that navigation was triggered by keyboard
      self.lastNavigationSource = 'keyboard';
      
      // Space, Page Down, Arrow Down
      if (['Space', 'PageDown', 'ArrowDown'].indexOf(e.key) > -1 || [32, 34, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
        self.scrollToNextSection();
      }
      // Page Up, Arrow Up
      else if (['PageUp', 'ArrowUp'].indexOf(e.key) > -1 || [33, 38].indexOf(e.keyCode) > -1) {
        e.preventDefault();
        self.scrollToPreviousSection();
      }
      // Home
      else if (e.key === 'Home' || e.keyCode === 36) {
        e.preventDefault();
        self.scrollToSection(0);
      }
      // End
      else if (e.key === 'End' || e.keyCode === 35) {
        e.preventDefault();
        self.scrollToSection(self.sections.length - 1);
      }
    };
    
    document.addEventListener('keydown', keydownHandler);
    this.eventListeners.push({ element: document, event: 'keydown', handler: keydownHandler });
  };

  /**
   * Setup touch events for mobile
   */
  RINscroll.prototype.setupTouchEvents = function() {
    var self = this;
    
    var touchStartHandler = function(e) {
      // User initiated touch scroll - clear keyboard flag
      self.lastNavigationSource = null;
      
      // Reserved for future momentum scroll implementation
      var touchStartY = e.touches[0].clientY;
      var touchStartX = e.touches[0].clientX;
    };
    
    document.addEventListener('touchstart', touchStartHandler, { passive: true });
    this.eventListeners.push({ element: document, event: 'touchstart', handler: touchStartHandler, options: { passive: true } });
  };

  /**
   * Setup scroll intent detection
   * Detects input type (mouse, touch, trackpad) and scroll velocity
   */
  RINscroll.prototype.setupScrollIntentDetection = function() {
    var self = this;
    
    // Enhanced wheel handler for scroll intent detection
    var wheelHandler = function(e) {
      var now = Date.now();
      
      // Detect input type based on deltaY and deltaMode
      if (e.deltaMode === 0) {
        // deltaMode 0 = pixels (trackpad or high-precision mouse)
        if (Math.abs(e.deltaY) < 50 && Math.abs(e.deltaX) < 50) {
          self.scrollIntent.type = 'trackpad';
        } else {
          self.scrollIntent.type = 'mouse';
        }
      } else {
        // deltaMode 1 = lines (mouse wheel) or deltaMode 2 = pages (rare)
        self.scrollIntent.type = 'mouse';
      }
      
      // Calculate scroll velocity based on delta
      var delta = Math.abs(self.options.horizontal ? e.deltaX : e.deltaY);
      var timeDelta = now - self.scrollIntent.lastScrollTime;
      
      if (timeDelta > 0 && timeDelta < 100) {
        // Calculate velocity as pixels per millisecond
        self.scrollIntent.velocity = delta / timeDelta;
        
        // Add to samples for smoothing (keep last 5 samples)
        self.scrollIntent.scrollSamples.push(self.scrollIntent.velocity);
        if (self.scrollIntent.scrollSamples.length > 5) {
          self.scrollIntent.scrollSamples.shift();
        }
        
        // Calculate average velocity
        var avgVelocity = self.scrollIntent.scrollSamples.reduce(function(sum, v) {
          return sum + v;
        }, 0) / self.scrollIntent.scrollSamples.length;
        
        // Determine if this is a flick gesture
        // Threshold: > 2 px/ms for trackpad, > 1 px/ms for mouse
        var flickThreshold = self.scrollIntent.type === 'trackpad' ? 2 : 1;
        self.scrollIntent.isFlick = avgVelocity > flickThreshold;
      }
      
      self.scrollIntent.lastScrollTime = now;
    };
    
    // Enhanced touch handler for scroll intent detection
    var touchStartTime = 0;
    var touchStartY = 0;
    var touchStartX = 0;
    
    var enhancedTouchStartHandler = function(e) {
      self.scrollIntent.type = 'touch';
      touchStartTime = Date.now();
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      self.scrollIntent.velocity = 0;
      self.scrollIntent.isFlick = false;
    };
    
    var touchMoveHandler = function(e) {
      if (touchStartTime === 0) return;
      
      var now = Date.now();
      var timeDelta = now - touchStartTime;
      var currentY = e.touches[0].clientY;
      var currentX = e.touches[0].clientX;
      
      var deltaY = Math.abs(currentY - touchStartY);
      var deltaX = Math.abs(currentX - touchStartX);
      var delta = self.options.horizontal ? deltaX : deltaY;
      
      if (timeDelta > 0) {
        self.scrollIntent.velocity = delta / timeDelta;
        
        // For touch, flick is faster movement (> 1 px/ms)
        self.scrollIntent.isFlick = self.scrollIntent.velocity > 1;
      }
    };
    
    var touchEndHandler = function(e) {
      // Finalize flick detection on touch end
      // Keep the isFlick state for a short duration for adaptive snap
      touchStartTime = 0;
    };
    
    // Add wheel listener for mouse/trackpad detection
    window.addEventListener('wheel', wheelHandler, { passive: true });
    this.eventListeners.push({ element: window, event: 'wheel', handler: wheelHandler, options: { passive: true } });
    
    // Add touch listeners for touch detection
    document.addEventListener('touchstart', enhancedTouchStartHandler, { passive: true });
    this.eventListeners.push({ element: document, event: 'touchstart', handler: enhancedTouchStartHandler, options: { passive: true } });
    
    document.addEventListener('touchmove', touchMoveHandler, { passive: true });
    this.eventListeners.push({ element: document, event: 'touchmove', handler: touchMoveHandler, options: { passive: true } });
    
    document.addEventListener('touchend', touchEndHandler, { passive: true });
    this.eventListeners.push({ element: document, event: 'touchend', handler: touchEndHandler, options: { passive: true } });
  };

  /**
   * Apply iOS specific fixes
   */
  RINscroll.prototype.applyIOSFixes = function() {
    // iOS-specific optimizations for smooth scrolling
    // Modern iOS versions handle scrolling natively
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      // Apply momentum scrolling if supported
      if ('webkitOverflowScrolling' in document.body.style) {
        document.body.style.webkitOverflowScrolling = 'touch';
      }
    }
  };

  /**
   * Disable animations for reduced motion preference
   */
  RINscroll.prototype.disableAnimations = function() {
    this.options.smoothScroll = false;
    this.options.smoothScrollDuration = 0;
  };

  /**
   * Scroll to element with smooth animation
   */
  RINscroll.prototype.scrollToElement = function(element, triggerSnapCallbacks) {
    if (!element) return;
    
    var self = this;
    var targetPosition = this.options.horizontal
      ? element.offsetLeft
      : element.offsetTop;
    
    targetPosition -= this.options.smoothScrollOffset;
    
    // Find section if snap callbacks should be triggered
    var section = null;
    if (triggerSnapCallbacks) {
      section = this.findSectionByElement(element);
    }
    
    if (this.options.reducedMotion || this.options.smoothScrollDuration === 0) {
      // Fire onSnapStart if applicable
      if (section && this.options.onSnapStart) {
        this.options.onSnapStart(section);
      }
      
      // Instant scroll for reduced motion
      if (this.options.horizontal) {
        window.scrollTo(targetPosition, 0);
      } else {
        window.scrollTo(0, targetPosition);
      }
      
      // Fire onSnapEnd if applicable
      if (section && this.options.onSnapEnd) {
        this.options.onSnapEnd(section);
      }
      return;
    }
    
    // Fire onSnapStart callback
    if (section && this.options.onSnapStart) {
      this.options.onSnapStart(section);
    }
    
    // Determine snap duration based on scroll intent if adaptive snap is enabled
    var snapDuration = this.options.smoothScrollDuration;
    
    if (this.options.scrollIntent && 
        this.options.scrollIntent.enabled && 
        this.options.scrollIntent.adaptiveSnap &&
        triggerSnapCallbacks) {
      
      // Adaptive snap: adjust duration based on scroll intent
      if (this.scrollIntent.isFlick) {
        // Fast flick: use faster snap (60% of normal duration)
        snapDuration = Math.max(300, this.options.smoothScrollDuration * 0.6);
      } else if (this.scrollIntent.velocity > 0 && this.scrollIntent.velocity < 0.5) {
        // Slow scroll: use slightly longer snap for smoothness (120% of normal duration)
        snapDuration = Math.min(1200, this.options.smoothScrollDuration * 1.2);
      }
      // Medium velocity: use default duration
    }
    
    // Smooth scroll animation
    var startPosition = this.options.horizontal ? window.pageXOffset : window.pageYOffset;
    var distance = targetPosition - startPosition;
    var startTime = null;
    
    function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      var timeElapsed = currentTime - startTime;
      var progress = Math.min(timeElapsed / snapDuration, 1);
      
      var easeProgress = self.easing[self.options.snapEasing](progress);
      var newPosition = startPosition + (distance * easeProgress);
      
      if (self.options.horizontal) {
        window.scrollTo(newPosition, 0);
      } else {
        window.scrollTo(0, newPosition);
      }
      
      if (timeElapsed < snapDuration) {
        requestAnimationFrame(animation);
      } else {
        // Fire onSnapEnd callback when animation completes
        if (section && self.options.onSnapEnd) {
          self.options.onSnapEnd(section);
        }
      }
    }
    
    requestAnimationFrame(animation);
  };

  /**
   * Scroll to section by index
   */
  RINscroll.prototype.scrollToSection = function(index) {
    if (index < 0 || index >= this.sections.length) return;
    
    var self = this;
    var section = this.sections[index];
    
    // Scroll to the section element with snap callbacks
    this.scrollToElement(section.element, true);
    
    // Manage focus after scroll completes
    if (this.options.focus && this.options.focus.enabled) {
      var scrollDuration = this.options.reducedMotion ? 0 : this.options.smoothScrollDuration;
      setTimeout(function() {
        self.manageFocus(section);
      }, scrollDuration);
    }
  };

  /**
   * Scroll to next section
   */
  RINscroll.prototype.scrollToNextSection = function() {
    if (!this.currentSection) {
      this.scrollToSection(0);
      return;
    }
    
    var nextIndex = this.currentSection.index + 1;
    if (nextIndex < this.sections.length) {
      this.scrollToSection(nextIndex);
    }
  };

  /**
   * Scroll to previous section
   */
  RINscroll.prototype.scrollToPreviousSection = function() {
    if (!this.currentSection) return;
    
    var prevIndex = this.currentSection.index - 1;
    if (prevIndex >= 0) {
      this.scrollToSection(prevIndex);
    }
  };

  /**
   * Manage focus for a section
   * @param {Object} section - Section object to manage focus for
   */
  RINscroll.prototype.manageFocus = function(section) {
    // Only manage focus if enabled and navigation was via keyboard
    if (!this.options.focus || !this.options.focus.enabled) return;
    if (this.lastNavigationSource !== 'keyboard') return;
    
    var focusConfig = this.options.focus;
    var targetElement = null;
    
    // Determine the focus target based on configuration
    if (typeof focusConfig.target === 'function') {
      // Custom function to determine target
      targetElement = focusConfig.target(section);
    } else if (typeof focusConfig.target === 'string') {
      if (focusConfig.target === 'section') {
        // Focus the section itself
        targetElement = section.element;
      } else {
        // Treat as CSS selector within the section (with safe wrapper)
        try {
          targetElement = section.element.querySelector(focusConfig.target);
        } catch (e) {
          console.warn('RINscroll: Invalid focus target selector "' + focusConfig.target + '". Skipping focus.');
          this.lastNavigationSource = null;
          return;
        }
      }
    } else if (focusConfig.target === undefined || focusConfig.target === 'section') {
      // Default to section element
      targetElement = section.element;
    }
    
    if (!targetElement) {
      // Clear keyboard flag if no target found
      this.lastNavigationSource = null;
      return;
    }
    
    // Ensure element is focusable
    // If element doesn't have tabindex and is not naturally focusable, add tabindex="-1"
    if (!targetElement.hasAttribute('tabindex') && 
        !this.isFocusableElement(targetElement)) {
      targetElement.setAttribute('tabindex', '-1');
    }
    
    // Apply focus with preventScroll option
    var preventScroll = focusConfig.preventScroll !== false; // Default true
    try {
      targetElement.focus({ preventScroll: preventScroll });
    } catch (e) {
      // Fallback for browsers that don't support focus options
      targetElement.focus();
    }
    
    // Clear keyboard navigation flag after focus is applied
    this.lastNavigationSource = null;
  };

  /**
   * Check if element is naturally focusable
   * @param {HTMLElement} element - Element to check
   * @return {Boolean} - Whether element is naturally focusable
   */
  RINscroll.prototype.isFocusableElement = function(element) {
    var focusableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
    return focusableTags.indexOf(element.tagName) > -1;
  };

  /**
   * Update section progress bar
   */
  RINscroll.prototype.updateSectionProgress = function(section) {
    var progressBar = section.element.querySelector('.rinscroll-section-progress-bar');
    if (progressBar) {
      progressBar.style.width = (section.progress * 100) + '%';
    }
  };

  /**
   * Find section by element
   */
  RINscroll.prototype.findSectionByElement = function(element) {
    for (var i = 0; i < this.sections.length; i++) {
      if (this.sections[i].element === element) {
        return this.sections[i];
      }
    }
    return null;
  };

  /**
   * Update section state based on scroll position
   */
  RINscroll.prototype.updateSectionState = function(section, entry) {
    if (!section) return;
    
    // Determine state based on position and intersection
    var rect = entry.boundingClientRect;
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    
    var oldState = section.state;
    
    if (this.options.horizontal) {
      // Horizontal scroll state logic
      if (rect.left > viewportWidth) {
        section.state = 'upcoming';
      } else if (rect.right < 0) {
        section.state = 'passed';
      } else {
        section.state = 'active';
      }
    } else {
      // Vertical scroll state logic
      if (rect.top > viewportHeight) {
        section.state = 'upcoming';
      } else if (rect.bottom < 0) {
        section.state = 'passed';
      } else {
        section.state = 'active';
      }
    }
    
    // Add state class to element if state changed
    if (oldState !== section.state) {
      section.element.classList.remove('rinscroll-state-' + oldState);
      section.element.classList.add('rinscroll-state-' + section.state);
    }
  };

  /**
   * Setup scroll to top functionality
   */
  RINscroll.prototype.setupScrollToTop = function() {
    var self = this;
    var config = this.options.scrollToTop;
    
    // Custom button binding
    if (config.target) {
      var targetElement = this.safeQuerySelector(config.target);
      if (targetElement) {
        var clickHandler = function(e) {
          e.preventDefault();
          self.scrollToTop({
            behavior: config.behavior || 'smooth',
            focus: config.focus !== false
          });
        };
        targetElement.addEventListener('click', clickHandler);
        this.eventListeners.push({ element: targetElement, event: 'click', handler: clickHandler });
      }
    }
    
    // Default UI
    if (config.ui) {
      this.createScrollToTopButton(config);
    }
  };

  /**
   * Create default scroll to top button UI
   */
  RINscroll.prototype.createScrollToTopButton = function(config) {
    var self = this;
    
    // Create button element
    var button = document.createElement('button');
    button.className = 'rinscroll-scroll-to-top';
    button.setAttribute('aria-label', 'Scroll to top');
    button.setAttribute('type', 'button');
    
    // Create icon span element (avoid innerHTML)
    var iconSpan = document.createElement('span');
    iconSpan.className = 'rinscroll-scroll-to-top-icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.textContent = '↑';
    button.appendChild(iconSpan);
    
    // Apply position class (validate position value)
    var position = config.position || 'bottom-right';
    var validPositions = ['bottom-right', 'bottom-center', 'bottom-left'];
    if (validPositions.indexOf(position) === -1) {
      position = 'bottom-right';
    }
    button.classList.add('rinscroll-scroll-to-top-' + position);
    
    // Initially hidden
    button.style.opacity = '0';
    button.style.visibility = 'hidden';
    
    // Add to DOM
    document.body.appendChild(button);
    this.scrollToTopButton = button;
    
    // Click handler
    var clickHandler = function(e) {
      e.preventDefault();
      self.scrollToTop({
        behavior: config.behavior || 'smooth',
        focus: config.focus !== false
      });
    };
    button.addEventListener('click', clickHandler);
    this.eventListeners.push({ element: button, event: 'click', handler: clickHandler });
    
    // Show/hide based on scroll position
    this.scrollToTopShowAfter = config.showAfter || 0.3;
    this.updateScrollToTopVisibility();
  };

  /**
   * Update scroll to top button visibility
   */
  RINscroll.prototype.updateScrollToTopVisibility = function() {
    if (!this.scrollToTopButton) return;
    
    var currentPosition = this.options.horizontal 
      ? window.pageXOffset 
      : window.pageYOffset;
    
    var scrollHeight = this.options.horizontal
      ? document.documentElement.scrollWidth - document.documentElement.clientWidth
      : document.documentElement.scrollHeight - document.documentElement.clientHeight;
    
    var shouldShow = false;
    
    // Check if showAfter is a percentage (0-1) or pixel value
    if (this.scrollToTopShowAfter <= 1) {
      // Percentage of total scroll
      var progress = scrollHeight > 0 ? currentPosition / scrollHeight : 0;
      shouldShow = progress >= this.scrollToTopShowAfter;
    } else {
      // Pixel value
      shouldShow = currentPosition >= this.scrollToTopShowAfter;
    }
    
    // Update button visibility
    if (shouldShow) {
      this.scrollToTopButton.style.opacity = '1';
      this.scrollToTopButton.style.visibility = 'visible';
    } else {
      this.scrollToTopButton.style.opacity = '0';
      this.scrollToTopButton.style.visibility = 'hidden';
    }
  };

  /**
   * Scroll to top of page or first section
   * @param {Object} options - Options for scrollToTop
   * @param {String} options.behavior - "smooth" or "instant"
   * @param {Boolean} options.focus - Whether to focus first section
   */
  RINscroll.prototype.scrollToTop = function(options) {
    var opts = options || {};
    var behavior = opts.behavior || 'smooth';
    var shouldFocus = opts.focus !== false;
    
    // Respect reduced motion
    if (this.options.reducedMotion) {
      behavior = 'instant';
    }
    
    // Determine target element
    var targetElement = this.sections.length > 0 ? this.sections[0].element : null;
    var targetPosition = 0;
    
    if (behavior === 'instant' || this.options.reducedMotion) {
      // Instant scroll to top
      window.scrollTo(0, 0);
    } else {
      // Smooth scroll using built-in scrollToElement
      if (targetElement) {
        this.scrollToElement(targetElement);
      } else {
        // Fallback: smooth scroll to top
        var self = this;
        var startPosition = this.options.horizontal ? window.pageXOffset : window.pageYOffset;
        var distance = -startPosition;
        var startTime = null;
        
        function animation(currentTime) {
          if (startTime === null) startTime = currentTime;
          var timeElapsed = currentTime - startTime;
          var progress = Math.min(timeElapsed / self.options.smoothScrollDuration, 1);
          
          var easeProgress = self.easing[self.options.snapEasing](progress);
          var newPosition = startPosition + (distance * easeProgress);
          
          if (self.options.horizontal) {
            window.scrollTo(newPosition, 0);
          } else {
            window.scrollTo(0, newPosition);
          }
          
          if (timeElapsed < self.options.smoothScrollDuration) {
            requestAnimationFrame(animation);
          } else if (shouldFocus && targetElement) {
            // Set focus after scroll completes
            targetElement.focus();
          }
        }
        
        requestAnimationFrame(animation);
        return;
      }
    }
    
    // Set focus if requested and target exists
    if (shouldFocus && targetElement) {
      setTimeout(function() {
        targetElement.focus();
      }, behavior === 'instant' ? 0 : this.options.smoothScrollDuration);
    }
  };

  /**
   * Destroy the scroll system
   */
  RINscroll.prototype.destroy = function() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // Remove all event listeners
    if (this.eventListeners) {
      this.eventListeners.forEach(function(listener) {
        if (listener.options) {
          listener.element.removeEventListener(listener.event, listener.handler, listener.options);
        } else {
          listener.element.removeEventListener(listener.event, listener.handler);
        }
      });
      this.eventListeners = [];
    }
    
    // Remove progress bar if created by script
    if (this.progressBar && this.progressBar.parentNode) {
      this.progressBar.parentNode.removeChild(this.progressBar);
    }
    
    // Remove scroll to top button if created by script
    if (this.scrollToTopButton && this.scrollToTopButton.parentNode) {
      this.scrollToTopButton.parentNode.removeChild(this.scrollToTopButton);
    }
    
    // Remove active classes
    this.sections.forEach(function(section) {
      section.element.classList.remove('rinscroll-active');
    });
  };

  /**
   * Easing functions
   */
  RINscroll.prototype.easing = {
    linear: function(t) { return t; },
    easeInQuad: function(t) { return t * t; },
    easeOutQuad: function(t) { return t * (2 - t); },
    easeInOutQuad: function(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
    easeInCubic: function(t) { return t * t * t; },
    easeOutCubic: function(t) { return (--t) * t * t + 1; },
    easeInOutCubic: function(t) { return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1; }
  };

  // Export to window
  window.RINscroll = RINscroll;

})(window, document);
