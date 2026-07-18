(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointerFine = window.matchMedia("(pointer: fine)");

  // Sticky/shrinking header
  const header = document.getElementById("site-header");
  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile nav
  const menuToggle = document.getElementById("menu-toggle");
  const mobileNav = document.getElementById("mobile-nav");

  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("is-open");
    document.body.style.overflow = "";
  };
  const openMenu = () => {
    menuToggle.setAttribute("aria-expanded", "true");
    mobileNav.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    isOpen ? closeMenu() : openMenu();
  });
  mobileNav.querySelectorAll("a, button").forEach((el) => {
    el.addEventListener("click", closeMenu);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

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
      emailError.textContent = valid ? "" : "Enter a valid email address.";

      if (!name || !valid || !message) {
        if (!valid) emailField.focus();
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
        emailError.textContent = valid ? "" : "Enter a valid email address.";
      }
    });
  }

  // Reveal-on-scroll — IntersectionObserver toggles .is-visible; CSS decides
  // how each element type animates in.
  if ("IntersectionObserver" in window) {
    const revealTargets = document.querySelectorAll(".reveal-fade, .reveal-tile");
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    revealTargets.forEach((el) => revealObserver.observe(el));

    // Belief timeline line-draw fires once the whole timeline enters view
    const beliefTimeline = document.querySelector(".belief-timeline");
    if (beliefTimeline) {
      const lineObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            lineObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      lineObserver.observe(beliefTimeline);
    }
  } else {
    document.querySelectorAll(".reveal-fade, .reveal-tile").forEach((el) => el.classList.add("is-visible"));
    const beliefTimeline = document.querySelector(".belief-timeline");
    if (beliefTimeline) beliefTimeline.classList.add("is-visible");
  }

  // Hero scroll-progress ring
  const scrollCue = document.querySelector(".scroll-cue-progress");
  if (scrollCue) {
    let ticking = false;
    const updateProgress = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const progress = max > 0 ? Math.min(window.scrollY / Math.min(max, window.innerHeight * 1.2), 1) : 0;
      doc.style.setProperty("--scroll-progress", progress.toFixed(3));
      ticking = false;
    };
    updateProgress();
    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(updateProgress);
        ticking = true;
      }
    }, { passive: true });
  }

  // Story parallax — two frames drift at different rates as the section scrolls
  const parallaxEls = [...document.querySelectorAll("[data-parallax]")];
  if (parallaxEls.length && !reducedMotion.matches) {
    let rafId = 0;
    const applyParallax = () => {
      const viewportH = window.innerHeight;
      parallaxEls.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const centerOffset = rect.top + rect.height / 2 - viewportH / 2;
        const rate = i % 2 === 0 ? 0.06 : -0.09;
        el.style.transform = `translate3d(0, ${(-centerOffset * rate).toFixed(1)}px, 0)`;
      });
      rafId = 0;
    };
    const requestParallax = () => {
      if (!rafId) rafId = window.requestAnimationFrame(applyParallax);
    };
    requestParallax();
    window.addEventListener("scroll", requestParallax, { passive: true });
    window.addEventListener("resize", requestParallax, { passive: true });
  }

  // Bento tile 3D tilt — pointer-driven, fine pointers only
  if (pointerFine.matches && !reducedMotion.matches) {
    document.querySelectorAll(".bento-tile").forEach((tile) => {
      const media = tile.querySelector("picture");
      const handleMove = (e) => {
        const rect = tile.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        media.style.setProperty("--rx", `${(px * 10).toFixed(2)}deg`);
        media.style.setProperty("--ry", `${(py * -10).toFixed(2)}deg`);
      };
      const reset = () => {
        media.style.setProperty("--rx", "0deg");
        media.style.setProperty("--ry", "0deg");
      };
      tile.addEventListener("pointermove", handleMove);
      tile.addEventListener("pointerleave", reset);
    });
  }

  // Magnetic cursor — desktop-only pull on [data-magnetic] elements, plus a
  // trailing ring cursor. Off entirely on touch/coarse pointers and reduced
  // motion.
  if (pointerFine.matches && !reducedMotion.matches) {
    const ring = document.getElementById("cursor-ring");
    let ringX = -100, ringY = -100, targetX = -100, targetY = -100;

    const moveRing = () => {
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      if (ring) ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
      window.requestAnimationFrame(moveRing);
    };
    window.requestAnimationFrame(moveRing);

    window.addEventListener("pointermove", (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (ring) ring.classList.add("is-active");
    }, { passive: true });
    window.addEventListener("pointerleave", () => {
      if (ring) ring.classList.remove("is-active");
    });

    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - (rect.left + rect.width / 2);
        const relY = e.clientY - (rect.top + rect.height / 2);
        el.style.transform = `translate(${(relX * 0.22).toFixed(1)}px, ${(relY * 0.22).toFixed(1)}px)`;
        if (ring) ring.classList.add("is-magnetic");
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
        if (ring) ring.classList.remove("is-magnetic");
      });
    });
  }
})();
