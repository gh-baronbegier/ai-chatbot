(function () {
  "use strict";

  function afterPaint(fn) {
    requestAnimationFrame(function () {
      requestAnimationFrame(fn);
    });
  }

  afterPaint(function () {
    // -------- Top bar (nav toggle) ----------
    var topbar = document.getElementById("sidebar-top-bar");
    var menuIcon = document.getElementById("topbar-menu");
    var closeIcon = document.getElementById("topbar-close");

    if (topbar && menuIcon && closeIcon) {
      var syncIcons = function () {
        var open = document.documentElement.dataset.navPanelOpen === "true";
        menuIcon.style.display = open ? "none" : "";
        closeIcon.style.display = open ? "" : "none";
      };

      syncIcons();

      topbar.addEventListener("click", function () {
        window.dispatchEvent(new CustomEvent("toggle-nav-panel"));
      });

      topbar.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("toggle-nav-panel"));
        }
      });

      var topScheduled = false;
      var topObs = new MutationObserver(function () {
        if (topScheduled) return;
        topScheduled = true;
        requestAnimationFrame(function () {
          topScheduled = false;
          syncIcons();
        });
      });
      topObs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-nav-panel-open"],
      });
    }

    // -------- Bottom bar ----------
    var bar = document.getElementById("bottom-bar");
    var text = document.getElementById("bb-text");
    var chevron = document.getElementById("bb-chevron");
    if (!bar || !text || !chevron) return;

    var lastPath = "";
    var scheduled = false;

    function updateHref() {
      if (location.pathname === lastPath) return;
      lastPath = location.pathname;
      var id = location.pathname.replace(/^\//, "");
      text.href = id
        ? "https://baronbegier.com?c=" + encodeURIComponent(id)
        : "https://baronbegier.com";
    }

    function update() {
      var navOpen = document.documentElement.dataset.navPanelOpen === "true";
      if (navOpen) {
        var navView = document.documentElement.dataset.navView || "chats";
        var modelLabel =
          document.documentElement.dataset.navModelLabel || "";
        text.style.display = "";
        text.removeAttribute("href");
        text.removeAttribute("target");
        text.style.color = "inherit";
        text.style.cursor = "default";
        bar.style.cursor = "default";
        var menuIsOpen =
          document.documentElement.dataset.navMenuOpen === "true";
        if (menuIsOpen) {
          text.textContent = "menu";
          chevron.style.display = "none";
          return;
        }
        var viewLabels = {
          chats: "chats",
          model: modelLabel.toLowerCase(),
          tools: "tools",
          mcp: "mcp",
          appearance: "appearance",
          signin: "sign in",
        };
        text.textContent = viewLabels[navView] || navView;
        chevron.style.display = "none";
        return;
      }
      text.style.color = "inherit";
      text.style.cursor = "";
      bar.style.cursor = "pointer";
      text.textContent = "baronbegier.com";
      text.href = "https://baronbegier.com";
      text.target = "_blank";
      bar.style.display = "flex";
      var scrolledUp =
        document.documentElement.dataset.chatAtBottom === "false";
      text.style.display = scrolledUp ? "none" : "";
      chevron.style.display = scrolledUp ? "" : "none";
      updateHref();
    }

    function scheduleUpdate() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        update();
      });
    }

    updateHref();
    update();

    bar.addEventListener("click", function (e) {
      if (document.documentElement.dataset.navPanelOpen === "true") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-nav-menu"));
        return;
      }
      if (document.documentElement.dataset.chatAtBottom === "false") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("scroll-chat-to-bottom"));
        return;
      }
      if (e.target !== text && text.href) {
        window.open(text.href, "_blank", "noopener,noreferrer");
      }
    });

    window.addEventListener("toggle-nav-panel", function () {
      setTimeout(scheduleUpdate, 0);
    });
    window.addEventListener("popstate", updateHref);

    var _pushState = history.pushState;
    history.pushState = function () {
      _pushState.apply(this, arguments);
      updateHref();
    };
    var _replaceState = history.replaceState;
    history.replaceState = function () {
      _replaceState.apply(this, arguments);
      updateHref();
    };

    var obs = new MutationObserver(scheduleUpdate);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "data-chat-at-bottom",
        "data-nav-panel-open",
        "data-nav-view",
        "data-nav-model-label",
        "data-nav-menu-open",
      ],
    });
  });
})();
