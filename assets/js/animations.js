// Animations for the landing page
document.addEventListener('DOMContentLoaded', () => {
  // Initialize animations
  initAnimations();
  
  // Initialize scroll events
  initScrollEvents();
});

// Initialize animations
function initAnimations() {
  // Get all elements with animation classes
  const animatedElements = document.querySelectorAll('.animate');
  
  // Add animation to elements that are in viewport on load
  animatedElements.forEach(element => {
    if (isElementInViewport(element)) {
      element.style.opacity = '1';
    }
  });
}

// Initialize scroll events
function initScrollEvents() {
  // Track scroll position for header visibility
  let lastScrollTop = 0;
  
  // Handle scroll events
  window.addEventListener('scroll', () => {
    // Handle animated elements on scroll
    handleScrollAnimations();
    
    // Get current scroll position
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Parallax effect for background elements
    handleParallaxEffect(scrollTop);
  });
}

// Handle animations on scroll
function handleScrollAnimations() {
  const animatedElements = document.querySelectorAll('.animate');
  
  animatedElements.forEach(element => {
    if (isElementInViewport(element) && element.style.opacity !== '1') {
      element.style.opacity = '1';
    }
  });
  
  // Handle reveal animations for content sections
  const revealElements = document.querySelectorAll('.reveal');
  
  revealElements.forEach(element => {
    if (isElementInViewport(element)) {
      element.classList.add('active');
    }
  });
}

// Create parallax effect on scroll
function handleParallaxEffect(scrollTop) {
  const pixels = document.querySelectorAll('.pixel');
  
  pixels.forEach((pixel, index) => {
    // Different parallax speeds for each pixel
    const speed = 0.05 + (index * 0.02);
    const yPos = -scrollTop * speed;
    
    pixel.style.transform = `translateY(${yPos}px) rotate(${scrollTop * 0.02}deg)`;
  });
}

// Check if element is in viewport
function isElementInViewport(el) {
  const rect = el.getBoundingClientRect();
  
  return (
    rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.bottom >= 0 &&
    rect.left <= (window.innerWidth || document.documentElement.clientWidth) &&
    rect.right >= 0
  );
}

// Reveal animations on scroll
const revealElements = document.querySelectorAll('.reveal');
  
function revealOnScroll() {
  for (let i = 0; i < revealElements.length; i++) {
    const windowHeight = window.innerHeight;
    const elementTop = revealElements[i].getBoundingClientRect().top;
    const elementVisible = 150;
    
    if (elementTop < windowHeight - elementVisible) {
      revealElements[i].classList.add('active');
    }
  }
}
  
window.addEventListener('scroll', revealOnScroll);
revealOnScroll(); // Check on load

// Avatar animation effects
const avatar = document.querySelector('.avatar-image');
if (avatar) {
  // Add hover effect
  avatar.addEventListener('mouseenter', function() {
    this.style.transform = 'scale(1.1) rotate(5deg)';
  });
  
  avatar.addEventListener('mouseleave', function() {
    this.style.transform = 'scale(1) rotate(0deg)';
  });
  
  // Add click effect - sparkle animation
  avatar.addEventListener('click', function(e) {
    createSparkle(e.clientX, e.clientY);
  });
}

// Create sparkle effect
function createSparkle(x, y) {
  const sparkle = document.createElement('div');
  sparkle.className = 'sparkle';
  sparkle.style.left = `${x}px`;
  sparkle.style.top = `${y}px`;
  document.body.appendChild(sparkle);
  
  setTimeout(() => {
    sparkle.remove();
  }, 1000);
}

// Parallax effect for pixel elements
const pixelElements = document.querySelectorAll('.pixel-element');

// Add interactive effects to pixel elements
pixelElements.forEach(element => {
  // Add hover effect with simple inline styles
  element.addEventListener('mouseenter', function() {
    this.style.filter = 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))';
    this.style.opacity = '1';
    this.style.transform = 'scale(1.2)';
  });
  
  element.addEventListener('mouseleave', function() {
    this.style.filter = '';
    this.style.opacity = '0.6';
    this.style.transform = '';
  });
});

// Disable parallax effect since it causes jank
// We'll just let the CSS animations handle the movement
function movePixelElements(e) {
  // No movement - this prevents jank
}

document.addEventListener('mousemove', movePixelElements);

// Add falling animation for new elements periodically
setInterval(() => {
  // Create a new random pixel element
  // Include both traditional pixel elements and tech icons
  const types = [
    // Traditional elements
    'star', 'heart', 'gem', 'coin', 'sword',
    // Tech icons (occasionally)
    ...(Math.random() > 0.7 ? ['js', 'ruby', 'aws', 'python', 'html', 'css', 'unity', 'rails', 'react'] : [])
  ];
  const randomType = types[Math.floor(Math.random() * types.length)];
  
  const newElement = document.createElement('div');
  newElement.className = `pixel-element pixel-${randomType}`;
  
  // Random position at the top
  const randomX = Math.random() * 100;
  newElement.style.top = '-30px';
  newElement.style.left = `${randomX}%`;
  
  // Add falling animation
  newElement.style.animation = 'fall 10s linear forwards';
  
  // Add to the page
  document.getElementById('pixel-elements').appendChild(newElement);
  
  // Remove after animation completes
  setTimeout(() => {
    newElement.remove();
  }, 10000);
}, 3000); // Create a new element every 3 seconds

// Handle glass nav interactions
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.addEventListener('mouseenter', () => {
      link.classList.add('hover');
    });
    
    link.addEventListener('mouseleave', () => {
      link.classList.remove('hover');
    });
    
    link.addEventListener('click', (e) => {
      // Smooth scroll to section
      if (link.getAttribute('href').startsWith('#')) {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop,
            behavior: 'smooth'
          });
        }
      }
    });
  });
});
