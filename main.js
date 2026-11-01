const progress = document.querySelector('.progress');
const menu = document.querySelector('.menu');
const navlinks = document.querySelector('.navlinks');
const toast = document.querySelector('.toast');
let toastTimer;

const nav = document.querySelector('.nav');

// Keep the video reference available to the audio demo handlers.
const videoSection = document.querySelector('.video-scroll-section');
const videoFrame = document.querySelector('#videoFrame');
const performanceVideo = document.querySelector('#performanceVideo');

function updateProgress() {
  if (progress) {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.width =
      (max > 0 ? scrollY / max * 100 : 0) + '%';
  }

  if (nav) {
    nav.classList.toggle('nav-scrolled', window.scrollY > 36);
  }
}

window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

// Mobile navigation.
if (menu && navlinks) {
  menu.addEventListener('click', () => {
    const open = navlinks.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });

  navlinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navlinks.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    });
  });
}

// Reveal animations.
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.setProperty('--reveal-delay', `${(i % 4) * 90}ms`);
  observer.observe(el);
});

// Scroll-linked image drift.
const parallaxItems = [
  ...document.querySelectorAll(
    '.hero-photo img, .bio-photo img, .video-image img, .experience-card img'
  )
];

let scrollTick = false;

function scrollEffects() {
  const vh = innerHeight;

  parallaxItems.forEach(img => {
    const r = img.getBoundingClientRect();

    if (r.bottom > 0 && r.top < vh) {
      const progress = (vh - r.top) / (vh + r.height);
      const drift = (progress - 0.5) * -18;

      img.style.setProperty('--scroll-drift', `${drift}px`);
      img.style.transform =
        `translate3d(0, ${drift}px, 0) scale(${img.closest('.hero-photo') ? 1.03 : 1.035})`;
    }
  });

  scrollTick = false;
}

window.addEventListener('scroll', () => {
  if (!scrollTick) {
    requestAnimationFrame(scrollEffects);
    scrollTick = true;
  }
}, { passive: true });

scrollEffects();

// Active section navigation.
if (navlinks) {
  const sections = [...document.querySelectorAll('main section[id]')];

  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navlinks.querySelectorAll('a').forEach(a => {
          a.classList.toggle(
            'active',
            a.getAttribute('href') === '#' + entry.target.id
          );
        });
      }
    });
  }, { rootMargin: '-35% 0px -55% 0px' });

  sections.forEach(section => navObserver.observe(section));
}

// Footer year.
const year = document.getElementById('year');

if (year) {
  year.textContent = new Date().getFullYear();
}

// Toast notifications.
function showToast(msg) {
  if (!toast) return;

  toast.textContent = msg;
  toast.classList.add('show');

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// Format audio timestamps.
function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00';

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);

  return String(m).padStart(2, '0') + ':' +
         String(s).padStart(2, '0');
}

// Vinyl demo players.
const demoTracks = [...document.querySelectorAll('.demo-track')];

function stopTrack(t) {
  t.classList.remove('is-playing');

  const b = t.querySelector('.track-toggle');
  const audioElement = t.querySelector('audio');
  const trackState = t.querySelector('.track-state');
  const title = t.querySelector('h3')?.textContent || 'audio';

  if (b) {
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', 'Play ' + title + ' demo');

    const glyph = b.querySelector('.play-glyph');
    if (glyph) glyph.textContent = '▶';
  }

  if (trackState) {
    trackState.textContent = 'READY TO PLAY';
  }

  if (t._demoTimer) {
    clearInterval(t._demoTimer);
    t._demoTimer = null;
  }

  if (audioElement) {
    audioElement.pause();
  }
}

demoTracks.forEach((track, trackIndex) => {
  const waveform = track.querySelector('.waveform');
  const audio = track.querySelector('audio');
  const btn = track.querySelector('.track-toggle');
  const state = track.querySelector('.track-state');
  const elapsed = track.querySelector('.elapsed');
  const duration = track.querySelector('.duration');

  if (!waveform || !audio || !btn || !state || !elapsed || !duration) {
    return;
  }

  const bars = Array.from({ length: 64 }, (_, i) => {
    const wave =
      Math.sin(i * 0.43 + trackIndex) * 0.28 +
      Math.sin(i * 0.17 + 1.8) * 0.32 +
      Math.abs(Math.sin(i * 0.09 + trackIndex)) * 0.4;

    const h = Math.round(18 + wave * 78);
    const span = document.createElement('span');

    span.style.setProperty('--h', h + '%');
    span.style.setProperty('--delay', ((i % 13) * -47) + 'ms');

    waveform.appendChild(span);
    return span;
  });

  let previewSeconds = 0;
  const src = track.dataset.src?.trim();

  if (src) {
    audio.src = src;
    audio.preload = 'none';
    duration.textContent = '00:00';

    audio.addEventListener('loadedmetadata', () => {
      duration.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      elapsed.textContent = formatTime(audio.currentTime);

      const p = audio.duration
        ? audio.currentTime / audio.duration
        : 0;

      bars.forEach((bar, i) => {
        bar.classList.toggle('played', i / bars.length < p);
      });
    });

    audio.addEventListener('ended', () => stopTrack(track));

    audio.addEventListener('error', () => {
      state.textContent = 'AUDIO UNAVAILABLE';
      showToast('Could not load this recording. Check the audio file path.');
    });
  }

  btn.addEventListener('click', async () => {
    // Clicking the active demo pauses it.
    if (track.classList.contains('is-playing')) {
      stopTrack(track);
      return;
    }

    // Mute the performance video when a demo is started.
    if (performanceVideo) {
      performanceVideo.muted = true;
    }

    // Stop all other demo tracks.
    demoTracks.forEach(other => {
      if (other !== track) stopTrack(other);
    });

    track.classList.add('is-playing');

    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute(
      'aria-label',
      'Pause ' + (track.querySelector('h3')?.textContent || 'audio') + ' demo'
    );

    const glyph = btn.querySelector('.play-glyph');
    if (glyph) glyph.textContent = 'Ⅱ';

    state.textContent = src ? 'NOW PLAYING' : 'PLAYER PREVIEW';

    if (src) {
      try {
        await audio.play();
      } catch (error) {
        stopTrack(track);
        showToast(
          'Could not play this audio file. Check its path or browser permissions.'
        );
      }
    } else {
      previewSeconds = 0;
      elapsed.textContent = '00:00';

      bars.forEach(bar => bar.classList.remove('played'));

      track._demoTimer = setInterval(() => {
        previewSeconds++;
        elapsed.textContent = formatTime(previewSeconds);

        const p = (previewSeconds % 30) / 30;

        bars.forEach((bar, i) => {
          bar.classList.toggle('played', i / bars.length < p);
        });

        if (previewSeconds >= 30) {
          stopTrack(track);
        }
      }, 1000);
    }
  });
});

// Scroll-linked performance video.

 // Scroll-linked performance video.
if (performanceVideo) {
  const videoSource = performanceVideo.dataset.videoSrc?.trim();

  performanceVideo.controls = false;
  performanceVideo.removeAttribute('controls');
  performanceVideo.loop = true;
  performanceVideo.playsInline = true;
  performanceVideo.autoplay = false;
  performanceVideo.muted = false;
  performanceVideo.defaultMuted = false;
  performanceVideo.volume = 1;

  if (videoSource) {
    performanceVideo.src = videoSource;
    performanceVideo.load();
  }

  // Stop all demo tracks whenever the video starts playing.
  function stopAllDemos() {
    demoTracks.forEach(track => stopTrack(track));
  }

  performanceVideo.addEventListener('playing', () => {
    videoFrame?.classList.add('has-video');

    // Safety check: demos must never play alongside the video.
    stopAllDemos();
  });

  // Play with sound on hover.
  videoFrame?.addEventListener('mouseenter', async () => {
    stopAllDemos();

    performanceVideo.muted = false;
    performanceVideo.volume = 1;

    try {
      await performanceVideo.play();
    } catch (error) {
      console.warn('Video playback failed:', error);
    }
  });

  // Pause when the pointer leaves the video.
  videoFrame?.addEventListener('mouseleave', () => {
    performanceVideo.pause();
  });

  // Touchscreen fallback: tap to play.
  videoFrame?.addEventListener('click', async () => {
    stopAllDemos();

    performanceVideo.muted = false;
    performanceVideo.volume = 1;

    try {
      await performanceVideo.play();
    } catch (error) {
      console.warn('Video playback failed:', error);
    }
  });
}


// Animate video frame size as the page scrolls.
function updateVideoScale() {
  if (!videoSection || !videoFrame) return;

  const rect = videoSection.getBoundingClientRect();
  const total = videoSection.offsetHeight - innerHeight;

  const travelled = Math.min(
    1,
    Math.max(0, -rect.top / Math.max(1, total))
  );

  const eased = travelled * travelled * (3 - 2 * travelled);
  const mobile = innerWidth <= 650;

  const startW = mobile ? 92 : 76;
  const startH = mobile ? 54 : 66;

  videoFrame.style.width =
    (startW + (100 - startW) * eased) + 'vw';

  videoFrame.style.height =
    (startH + (100 - startH) * eased) + 'vh';

  videoFrame.style.borderRadius =
    (5 * (1 - eased)) + 'px';
}

window.addEventListener('scroll', updateVideoScale, { passive: true });
window.addEventListener('resize', updateVideoScale);
updateVideoScale();

// Gallery lightbox.
const lightbox = document.querySelector('.lightbox');
const lightboxImg = lightbox?.querySelector('img');

if (lightbox && lightboxImg) {
  document.querySelectorAll('.gallery-item').forEach(btn => {
    btn.addEventListener('click', () => {
      lightboxImg.src = btn.dataset.full;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lightboxImg.src = '';
  }

  lightbox.querySelector('.lightbox-close')?.addEventListener(
    'click',
    closeLightbox
  );

  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLightbox();
  });
}


/* Booking inquiry submission — Formspree */
const bookingForm = document.querySelector('#bookingForm');

if (bookingForm) {
  const dateField = bookingForm.querySelector('input[name="event_date"]');
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);

  if (dateField) dateField.min = localToday;

  bookingForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!bookingForm.reportValidity()) return;

    const submitButton = bookingForm.querySelector('button[type="submit"]');
    const status = bookingForm.querySelector('#bookingStatus');
    const endpoint = bookingForm.getAttribute('action');

    if (!endpoint || !endpoint.startsWith('https://formspree.io/f/')) {
      status.className = 'booking-status error';
      status.textContent = 'Booking form configuration error. Please contact us directly.';
    return;
}

    submitButton.disabled = true;
    status.className = 'booking-status';
    status.textContent = 'Sending your inquiry…';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(bookingForm),
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        let message = 'We could not submit your inquiry. Please try again.';
        try {
          const result = await response.json();
          if (result && result.errors && result.errors.length) {
            message = result.errors.map(item => item.message).join(' ');
          }
        } catch (_) {}
        throw new Error(message);
      }

      bookingForm.reset();
      if (dateField) dateField.min = localToday;

      status.className = 'booking-status success';
      status.textContent =
        'Thank you! Your booking inquiry has been received. A representative will reach out as soon as possible.';
      submitButton.textContent = 'INQUIRY SENT ✓';
    } catch (error) {
      status.className = 'booking-status error';
      status.textContent = error.message ||
        'Something went wrong. Please try again or email bookings@leolopezlive.com.';
      submitButton.disabled = false;
    }
  });
}
