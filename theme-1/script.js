(() => {
  "use strict";

  // Sticky header state
  const header = document.getElementById("site-header");
  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile nav
  const menuToggle = document.getElementById("menu-toggle");
  const mobileNav = document.getElementById("mobile-nav");
  const mobileNavClose = mobileNav.querySelector(".mobile-nav-close");
  const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const closeMenu = (restoreFocus = true) => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open menu");
    mobileNav.classList.remove("is-open");
    mobileNav.setAttribute("aria-hidden", "true");
    mobileNav.inert = true;
    document.body.style.overflow = "";
    if (restoreFocus) menuToggle.focus();
  };
  const openMenu = () => {
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Close menu");
    mobileNav.removeAttribute("aria-hidden");
    mobileNav.inert = false;
    mobileNav.classList.add("is-open");
    document.body.style.overflow = "hidden";
    mobileNavClose.focus();
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    isOpen ? closeMenu() : openMenu();
  });

  mobileNavClose.addEventListener("click", () => closeMenu());
  mobileNav.querySelectorAll("a").forEach((el) => el.addEventListener("click", () => closeMenu(false)));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileNav.classList.contains("is-open")) closeMenu();
    if (e.key !== "Tab" || !mobileNav.classList.contains("is-open")) return;
    const focusable = [...mobileNav.querySelectorAll(focusableSelector)].filter((el) => !el.inert);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900 && mobileNav.classList.contains("is-open")) closeMenu(false);
  }, { passive: true });

  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Product carousel — minimal, continuously looping, and touch friendly
  const carousel = document.getElementById("product-carousel");
  if (carousel) {
    const track = document.getElementById("product-track");
    const cards = [...track.querySelectorAll(".product-card")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const pixelsPerSecond = 55;
    let animationFrame = 0;
    let lastTimestamp = 0;
    let carouselIsVisible = !("IntersectionObserver" in window);
    let pointerIsDown = false;

    const clones = cards.map((card) => {
      const clone = card.cloneNode(true);
      clone.classList.add("is-clone");
      clone.classList.remove("reveal");
      clone.removeAttribute("data-reveal");
      clone.removeAttribute("style");
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
      return clone;
    });

    const cycleWidth = () => clones[0] ? clones[0].offsetLeft - cards[0].offsetLeft : 0;
    const normalizePosition = () => {
      const width = cycleWidth();
      if (width > 0 && track.scrollLeft >= width) track.scrollLeft %= width;
    };

    const canAnimate = () => !reducedMotion.matches && !coarsePointer.matches && window.innerWidth > 900 &&
      !document.hidden && carouselIsVisible &&
      !pointerIsDown && !carousel.matches(":hover") && !carousel.contains(document.activeElement);

    const stopCarousel = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      lastTimestamp = 0;
    };

    const animateCarousel = (timestamp) => {
      if (!canAnimate()) {
        stopCarousel();
        return;
      }

      if (lastTimestamp) {
        const elapsed = Math.min(timestamp - lastTimestamp, 64);
        track.scrollLeft += pixelsPerSecond * elapsed / 1000;
        normalizePosition();
      }
      lastTimestamp = timestamp;
      animationFrame = window.requestAnimationFrame(animateCarousel);
    };

    const startCarousel = () => {
      if (animationFrame || !canAnimate()) return;
      lastTimestamp = 0;
      animationFrame = window.requestAnimationFrame(animateCarousel);
    };

    track.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const gap = Number.parseFloat(window.getComputedStyle(track).gap) || 0;
      const step = cards[0].offsetWidth + gap;
      track.scrollBy({
        left: event.key === "ArrowRight" ? step : -step,
        behavior: reducedMotion.matches ? "auto" : "smooth"
      });
      window.setTimeout(normalizePosition, 500);
    });

    carousel.addEventListener("mouseenter", stopCarousel);
    carousel.addEventListener("mouseleave", startCarousel);
    carousel.addEventListener("focusin", stopCarousel);
    carousel.addEventListener("focusout", (event) => {
      if (!carousel.contains(event.relatedTarget)) startCarousel();
    });
    track.addEventListener("pointerdown", () => {
      pointerIsDown = true;
      stopCarousel();
    }, { passive: true });
    const releasePointer = () => {
      pointerIsDown = false;
      normalizePosition();
      startCarousel();
    };
    track.addEventListener("pointerup", releasePointer, { passive: true });
    track.addEventListener("pointercancel", releasePointer, { passive: true });

    document.addEventListener("visibilitychange", () => document.hidden ? stopCarousel() : startCarousel());
    reducedMotion.addEventListener("change", () => reducedMotion.matches ? stopCarousel() : startCarousel());
    coarsePointer.addEventListener("change", () => canAnimate() ? startCarousel() : stopCarousel());
    window.addEventListener("resize", () => {
      normalizePosition();
      canAnimate() ? startCarousel() : stopCarousel();
    }, { passive: true });

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(([entry]) => {
        carouselIsVisible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        if (carouselIsVisible) startCarousel();
        else stopCarousel();
      }, { threshold: [0.5] });
      observer.observe(carousel);
    }

    startCarousel();
  }

  // Contact form — validates, then hands off to the visitor's mail client
  const form = document.getElementById("contact-form");
  if (form) {
    const emailField = document.getElementById("email");
    const emailError = document.getElementById("email-error");
    const note = document.getElementById("form-note");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();

      const valid = emailPattern.test(email);
      emailField.closest(".field").classList.toggle("has-error", !valid);
      emailField.setAttribute("aria-invalid", String(!valid));
      emailError.textContent = valid ? "" : "Enter a valid email address.";

      if (!name || !valid || !message || !form.checkValidity()) {
        const firstInvalid = form.querySelector(":invalid");
        form.reportValidity();
        if (firstInvalid) firstInvalid.focus();
        note.textContent = "";
        return;
      }

      const subject = encodeURIComponent(`Message from ${name} via manaram.farm`);
      const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
      window.location.href = `mailto:info@manaram.group?subject=${subject}&body=${body}`;

      note.textContent = "Opening your email app to send this to info@manaram.group…";
      form.reset();
    });

    emailField.addEventListener("input", () => {
      if (emailField.closest(".field").classList.contains("has-error")) {
        const valid = emailPattern.test(emailField.value.trim());
        emailField.closest(".field").classList.toggle("has-error", !valid);
        emailField.setAttribute("aria-invalid", String(!valid));
        emailError.textContent = valid ? "" : "Enter a valid email address.";
      }
    });
  }
})();
