/* ==========================================================================
   Florence Event Design — Yönetim Paneli mantığı.
   Metinleri ve fotoğrafları assets/content.json üzerinden okur/yazar.
   ========================================================================== */
(function () {
  "use strict";

  var TEXT_SECTIONS = [
    { title: "Genel / Menü / Alt Bilgi", match: function (k) { return /^nav_|^footer_|^legal_|^newsletter_ph$|^meta_title$|^meta_desc$|^og_desc$|^testimonial_dot$|^scroll_cue$/.test(k); } },
    { title: "Anasayfa — Üst Bölüm (Hero)", match: function (k) { return /^hero_|^marquee_/.test(k); } },
    { title: "Anasayfa — Hikayemiz Özeti", match: function (k) { return /^about_eyebrow$|^about_title$|^about_link$|^story_p|^about_badge_|^about_img_[ab]_alt$|^stat_/.test(k); } },
    { title: "Anasayfa — Ürünler Bandı", match: function (k) { return /^services_|^product_explore$|^prod[1-9]_title$|^prod[1-9]_short$/.test(k); } },
    { title: "Ürünlerimiz Sayfası", match: function (k) { return /^products_page_|^prod[1-9]_full$|^prod[1-9]_img_alt$|^meta_title_products$|^meta_desc_products$/.test(k); } },
    { title: "Anasayfa — Çalışmalarımız / Referanslar / Güven", match: function (k) { return /^portfolio_|^filter_|^port[1-6]_|^view_gallery$|^view_full_gallery$|^testimonials_eyebrow$|^t[1-4]_|^press_label$|^trust[1-4]$/.test(k); } },
    { title: "İletişim (form + SSS + bilgiler)", match: function (k) { return /^contact_|^label_|^form_|^opt_|^faq|^meta_title_contact$|^meta_desc_contact$/.test(k); } },
    { title: "Hikayemiz Sayfası", match: function (k) { return /^about_page_|^founder_|^values_|^value[1-4]_|^about_cta_|^meta_title_about$|^meta_desc_about$/.test(k); } },
    { title: "Galeri Sayfası", match: function (k) { return /^gallery_page_|^g([1-9]|1[0-5])_(alt|loc)$|^meta_title_gallery$|^meta_desc_gallery$/.test(k); } },
    { title: "Blog Sayfası", match: function (k) { return /^blog_|^b[1-6]_|^meta_title_blog$|^meta_desc_blog$/.test(k); } }
  ];

  var IMAGE_SECTIONS = [
    { title: "Anasayfa", match: function (k) { return /^hero_img_[ab]$|^port[1-3]$/.test(k); } },
    { title: "Hikayemiz Sayfası", match: function (k) { return /^about_img_[ab]$|^founder_img$/.test(k); } },
    { title: "Ürünlerimiz (kartlar + sayfa)", match: function (k) { return /^prod[1-9]_img$/.test(k); } },
    { title: "Galeri Sayfası", match: function (k) { return /^g([1-9]|1[0-5])$/.test(k); } },
    { title: "Blog Sayfası", match: function (k) { return /^b[1-6]$/.test(k); } }
  ];

  var contentData = null;
  var currentLang = "tr";
  var unsaved = false;

  var loginScreen = document.getElementById("loginScreen");
  var panelScreen = document.getElementById("panelScreen");
  var loginForm = document.getElementById("loginForm");
  var loginError = document.getElementById("loginError");
  var statusBanner = document.getElementById("statusBanner");
  var saveBtn = document.getElementById("saveBtn");
  var saveHint = document.getElementById("saveHint");

  function labelFromKey(key) {
    return key.replace(/_/g, " ");
  }

  function showStatus(message, type) {
    statusBanner.textContent = message;
    statusBanner.className = "status-banner " + (type || "");
    statusBanner.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (type === "success") {
      setTimeout(function () { statusBanner.hidden = true; }, 3500);
    }
  }

  function markUnsaved() {
    unsaved = true;
    saveHint.textContent = "Kaydedilmemiş değişiklikler var.";
    saveBtn.style.background = "#a86a2e";
  }
  function markSaved() {
    unsaved = false;
    saveHint.textContent = "Tüm değişiklikler yayında.";
    saveBtn.style.background = "";
  }

  /* ---------- Oturum kontrolü ---------- */
  function checkSession() {
    fetch("/api/session")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.authenticated) {
          loginScreen.hidden = true;
          panelScreen.hidden = false;
          loadContent();
        } else {
          loginScreen.hidden = false;
          panelScreen.hidden = true;
        }
      })
      .catch(function () {
        loginScreen.hidden = false;
        panelScreen.hidden = true;
      });
  }

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    loginError.hidden = true;
    var username = document.getElementById("loginUsername").value.trim();
    var password = document.getElementById("loginPassword").value;
    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username, password: password })
    })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (res) {
        if (!res.ok) {
          loginError.textContent = res.data.error || "Giriş başarısız.";
          loginError.hidden = false;
          return;
        }
        loginScreen.hidden = true;
        panelScreen.hidden = false;
        loadContent();
      })
      .catch(function () {
        loginError.textContent = "Sunucuya ulaşılamadı.";
        loginError.hidden = false;
      });
  });

  document.getElementById("logoutBtn").addEventListener("click", function () {
    fetch("/api/logout", { method: "POST" }).then(function () {
      window.location.reload();
    });
  });

  /* ---------- İçerik yükleme ---------- */
  function loadContent() {
    fetch("../assets/content.json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        contentData = data;
        renderTexts();
        renderImages();
        markSaved();
      })
      .catch(function () {
        showStatus("İçerik yüklenemedi.", "error");
      });
  }

  /* ---------- Metinler sekmesi ---------- */
  function renderTexts() {
    var container = document.getElementById("textsSections");
    container.innerHTML = "";
    var dict = contentData.texts[currentLang];
    var keys = Object.keys(dict);

    TEXT_SECTIONS.forEach(function (section) {
      var sectionKeys = keys.filter(section.match);
      if (!sectionKeys.length) return;

      var sectionEl = document.createElement("div");
      sectionEl.className = "content-section";
      var h2 = document.createElement("h2");
      h2.textContent = section.title;
      sectionEl.appendChild(h2);

      var grid = document.createElement("div");
      grid.className = "field-grid";

      sectionKeys.forEach(function (key) {
        var value = dict[key] || "";
        var field = document.createElement("div");
        field.className = "field";

        var label = document.createElement("label");
        var labelText = document.createElement("span");
        labelText.textContent = labelFromKey(key);
        var keyTag = document.createElement("span");
        keyTag.className = "key-tag";
        keyTag.textContent = key;
        label.appendChild(labelText);
        label.appendChild(keyTag);
        field.appendChild(label);

        var input;
        if (value.length > 50) {
          input = document.createElement("textarea");
        } else {
          input = document.createElement("input");
          input.type = "text";
        }
        input.value = value;
        input.addEventListener("input", function () {
          contentData.texts[currentLang][key] = input.value;
          markUnsaved();
        });
        field.appendChild(input);
        grid.appendChild(field);
      });

      sectionEl.appendChild(grid);
      container.appendChild(sectionEl);
    });
  }

  document.getElementById("langToggle").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-lang]");
    if (!btn) return;
    currentLang = btn.getAttribute("data-lang");
    document.querySelectorAll("#langToggle button").forEach(function (b) {
      b.classList.toggle("is-active", b === btn);
    });
    renderTexts();
  });

  /* ---------- Fotoğraflar sekmesi ---------- */
  function renderImages() {
    var container = document.getElementById("imagesSections");
    container.innerHTML = "";
    var images = contentData.images;
    var keys = Object.keys(images);

    IMAGE_SECTIONS.forEach(function (section) {
      var sectionKeys = keys.filter(section.match);
      if (!sectionKeys.length) return;

      var sectionEl = document.createElement("div");
      sectionEl.className = "content-section";
      var h2 = document.createElement("h2");
      h2.textContent = section.title;
      sectionEl.appendChild(h2);

      var grid = document.createElement("div");
      grid.className = "image-grid";

      sectionKeys.forEach(function (key) {
        var url = images[key];
        var card = document.createElement("div");
        card.className = "image-card";

        var keyTag = document.createElement("span");
        keyTag.className = "key-tag";
        keyTag.textContent = key;
        card.appendChild(keyTag);

        var thumb = document.createElement("div");
        thumb.className = "thumb";
        var img = document.createElement("img");
        img.src = url;
        img.alt = key;
        thumb.appendChild(img);
        card.appendChild(thumb);

        var urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.value = url;
        urlInput.addEventListener("change", function () {
          contentData.images[key] = urlInput.value;
          img.src = urlInput.value;
          markUnsaved();
        });
        card.appendChild(urlInput);

        var uploadRow = document.createElement("div");
        uploadRow.className = "upload-row";
        var uploadLabel = document.createElement("label");
        uploadLabel.textContent = "Bilgisayardan Yükle";
        var fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
        var status = document.createElement("div");
        status.className = "upload-status";

        fileInput.addEventListener("change", function () {
          var file = fileInput.files[0];
          if (!file) return;
          status.textContent = "Yükleniyor…";
          var fd = new FormData();
          fd.append("image", file);
          fetch("/api/upload-image", { method: "POST", body: fd })
            .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
            .then(function (res) {
              if (!res.ok) {
                status.textContent = res.data.error || "Yükleme başarısız.";
                return;
              }
              contentData.images[key] = res.data.url;
              urlInput.value = res.data.url;
              img.src = res.data.url + "?t=" + Date.now();
              status.textContent = "Yüklendi — Kaydet'e basmayı unutmayın.";
              markUnsaved();
            })
            .catch(function () {
              status.textContent = "Yükleme başarısız.";
            });
        });

        uploadLabel.appendChild(fileInput);
        uploadRow.appendChild(uploadLabel);
        card.appendChild(uploadRow);
        card.appendChild(status);

        grid.appendChild(card);
      });

      sectionEl.appendChild(grid);
      container.appendChild(sectionEl);
    });
  }

  /* ---------- Sekme geçişi ---------- */
  document.querySelectorAll(".tab-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab-btn").forEach(function (b) { b.classList.toggle("is-active", b === btn); });
      var tab = btn.getAttribute("data-tab");
      document.getElementById("textsTab").hidden = tab !== "texts";
      document.getElementById("imagesTab").hidden = tab !== "images";
    });
  });

  /* ---------- Kaydet ---------- */
  saveBtn.addEventListener("click", function () {
    saveBtn.disabled = true;
    saveBtn.textContent = "Kaydediliyor…";
    fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contentData)
    })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (res) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Kaydet ve Yayınla";
        if (!res.ok) {
          showStatus(res.data.error || "Kaydedilemedi.", "error");
          return;
        }
        markSaved();
        showStatus("Değişiklikler kaydedildi ve yayına alındı.", "success");
      })
      .catch(function () {
        saveBtn.disabled = false;
        saveBtn.textContent = "Kaydet ve Yayınla";
        showStatus("Sunucuya ulaşılamadı.", "error");
      });
  });

  window.addEventListener("beforeunload", function (e) {
    if (unsaved) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ---------- Şifre değiştir ---------- */
  var passwordModal = document.getElementById("passwordModal");
  document.getElementById("changePasswordBtn").addEventListener("click", function () {
    document.getElementById("passwordError").hidden = true;
    document.getElementById("passwordForm").reset();
    passwordModal.hidden = false;
  });
  document.getElementById("passwordCancelBtn").addEventListener("click", function () {
    passwordModal.hidden = true;
  });
  document.getElementById("passwordForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var currentPassword = document.getElementById("currentPassword").value;
    var newPassword = document.getElementById("newPassword").value;
    var errEl = document.getElementById("passwordError");
    errEl.hidden = true;
    fetch("/api/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword })
    })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (res) {
        if (!res.ok) {
          errEl.textContent = res.data.error || "Şifre güncellenemedi.";
          errEl.hidden = false;
          return;
        }
        passwordModal.hidden = true;
        showStatus("Şifreniz güncellendi.", "success");
      })
      .catch(function () {
        errEl.textContent = "Sunucuya ulaşılamadı.";
        errEl.hidden = false;
      });
  });

  checkSession();
})();
