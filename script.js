document.documentElement.classList.add("has-js");

const proofStage = document.querySelector("[data-proof-stage]");
const soundToggles = document.querySelectorAll("[data-sound-toggle]");
const revealItems = document.querySelectorAll("[data-reveal]");
const externalWarningLinks = document.querySelectorAll("[data-leave-warning]");
const managedVideos = document.querySelectorAll("video");
const tiktokEmbeds = document.querySelectorAll(".tiktok-embed");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let proofMotionFrame = 0;
let tiktokScriptRequested = false;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateProofMotion() {
  if (!proofStage || reduceMotion.matches) {
    return;
  }

  const progress = clamp(window.scrollY / (window.innerHeight * 0.62), 0, 1);
  const eased = 1 - Math.pow(1 - progress, 3);
  const scale = 0.92 + eased * 0.08;
  const lift = Math.round(54 - eased * 54);
  const width = Math.round(1080 + eased * 220);

  proofStage.style.setProperty("--proof-scale", scale.toFixed(3));
  proofStage.style.setProperty("--proof-lift", `${lift}px`);
  proofStage.style.setProperty("--proof-width", `${width}px`);
}

function requestProofMotionUpdate() {
  if (proofMotionFrame) {
    return;
  }

  proofMotionFrame = window.requestAnimationFrame(() => {
    proofMotionFrame = 0;
    updateProofMotion();
  });
}

function showRevealItem(item) {
  item.classList.add("is-visible");
}

function getSoundVideo(soundToggle) {
  return soundToggle.closest(".proof__frame")?.querySelector("video");
}

function updateSoundToggle(soundToggle, proofVideo = getSoundVideo(soundToggle)) {
  if (!proofVideo || !soundToggle) {
    return;
  }

  const isUnmuted = !proofVideo.muted;

  soundToggle.classList.toggle("is-unmuted", isUnmuted);
  soundToggle.setAttribute("aria-pressed", String(isUnmuted));
  soundToggle.setAttribute("aria-label", isUnmuted ? "Mute video" : "Unmute video");
}

function updateSoundToggles() {
  soundToggles.forEach((soundToggle) => updateSoundToggle(soundToggle));
}

function toggleProofSound(event) {
  const soundToggle = event.currentTarget;
  const proofVideo = getSoundVideo(soundToggle);

  if (!proofVideo || !soundToggle) {
    return;
  }

  proofVideo.muted = !proofVideo.muted;

  if (!proofVideo.muted) {
    proofVideo.volume = 1;

    const playAttempt = proofVideo.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(() => {});
    }
  }

  updateSoundToggle(soundToggle, proofVideo);
}

function playManagedVideo(video) {
  if (document.visibilityState === "hidden" || reduceMotion.matches) {
    return;
  }

  const playAttempt = video.play();
  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {});
  }
}

function pauseManagedVideo(video) {
  if (!video.paused) {
    video.pause();
  }
}

function setupManagedVideos() {
  const visibleVideos = new Set();

  managedVideos.forEach((video) => {
    if (!video.closest(".hero")) {
      video.preload = "metadata";
    }
  });

  if (!("IntersectionObserver" in window)) {
    managedVideos.forEach(playManagedVideo);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visibleVideos.add(entry.target);
          playManagedVideo(entry.target);
          return;
        }

        visibleVideos.delete(entry.target);
        pauseManagedVideo(entry.target);
      });
    },
    { rootMargin: "900px 450px", threshold: 0.01 }
  );

  managedVideos.forEach((video) => observer.observe(video));

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      managedVideos.forEach(pauseManagedVideo);
      return;
    }

    visibleVideos.forEach(playManagedVideo);
  });
}

function setupCarousels() {
  const carousels = document.querySelectorAll("[data-carousel]");

  carousels.forEach((carousel) => {
    const track = carousel.querySelector("[data-carousel-track]");
    const previousButton = carousel.querySelector("[data-carousel-prev]");
    const nextButton = carousel.querySelector("[data-carousel-next]");

    if (!track) {
      return;
    }

    const scrollTrack = (direction) => {
      track.scrollBy({
        left: direction * Math.max(track.clientWidth * 0.78, 240),
        behavior: reduceMotion.matches ? "auto" : "smooth",
      });
    };

    previousButton?.addEventListener("click", () => scrollTrack(-1));
    nextButton?.addEventListener("click", () => scrollTrack(1));

    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    track.addEventListener("pointerdown", (event) => {
      isDragging = true;
      startX = event.clientX;
      startScrollLeft = track.scrollLeft;
      track.classList.add("is-dragging");
      track.setPointerCapture(event.pointerId);
    });

    track.addEventListener("pointermove", (event) => {
      if (!isDragging) {
        return;
      }

      event.preventDefault();
      track.scrollLeft = startScrollLeft - (event.clientX - startX);
    });

    const stopDragging = (event) => {
      if (!isDragging) {
        return;
      }

      isDragging = false;
      track.classList.remove("is-dragging");

      if (track.hasPointerCapture(event.pointerId)) {
        track.releasePointerCapture(event.pointerId);
      }
    };

    track.addEventListener("pointerup", stopDragging);
    track.addEventListener("pointercancel", stopDragging);
  });
}

function setupHoverVideos() {
  const hoverVideos = document.querySelectorAll("[data-hover-video]");

  hoverVideos.forEach((video) => {
    const playVideo = () => {
      video.muted = true;
      video.loop = true;

      const playAttempt = video.play();
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(() => {});
      }
    };

    const pauseVideo = () => {
      video.pause();

      try {
        video.currentTime = 0;
      } catch (error) {
        // Placeholder sources may be missing until real portfolio clips are added.
      }
    };

    video.addEventListener("pointerenter", playVideo);
    video.addEventListener("focus", playVideo);
    video.addEventListener("pointerleave", pauseVideo);
    video.addEventListener("blur", pauseVideo);
  });
}

function setupExternalWarnings() {
  externalWarningLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const message = link.dataset.leaveWarning;

      if (!message) {
        return;
      }

      event.preventDefault();

      if (!window.confirm(message)) {
        return;
      }

      const destination = link.href;
      const target = link.target || "_self";

      if (target === "_blank") {
        window.open(destination, target, "noopener,noreferrer");
        return;
      }

      window.location.href = destination;
    });
  });
}

function loadTikTokEmbeds() {
  if (tiktokScriptRequested || !tiktokEmbeds.length) {
    return;
  }

  tiktokScriptRequested = true;

  const script = document.createElement("script");
  script.src = "https://www.tiktok.com/embed.js";
  script.async = true;
  document.body.appendChild(script);
}

function setupTikTokEmbeds() {
  if (!tiktokEmbeds.length) {
    return;
  }

  const target = tiktokEmbeds[0].closest(".layer-block--feature") || tiktokEmbeds[0];

  if (!("IntersectionObserver" in window)) {
    loadTikTokEmbeds();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return;
      }

      loadTikTokEmbeds();
      observer.disconnect();
    },
    { rootMargin: "1800px 0px", threshold: 0.01 }
  );

  observer.observe(target);
}

function setupReveals() {
  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach(showRevealItem);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          showRevealItem(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

updateProofMotion();
updateSoundToggles();
setupManagedVideos();
setupCarousels();
setupHoverVideos();
setupExternalWarnings();
setupTikTokEmbeds();
setupReveals();

window.addEventListener("scroll", requestProofMotionUpdate, { passive: true });
window.addEventListener("resize", requestProofMotionUpdate);

soundToggles.forEach((soundToggle) => {
  const proofVideo = getSoundVideo(soundToggle);

  soundToggle.addEventListener("click", toggleProofSound);
  proofVideo?.addEventListener("volumechange", () => {
    updateSoundToggle(soundToggle, proofVideo);
  });
});

if (typeof reduceMotion.addEventListener === "function") {
  reduceMotion.addEventListener("change", () => {
    requestProofMotionUpdate();
    setupReveals();
  });
} else {
  reduceMotion.addListener(() => {
    requestProofMotionUpdate();
    setupReveals();
  });
}
