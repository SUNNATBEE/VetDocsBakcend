(function () {
  'use strict';

  var API_BASE = '/api/v1';
  // Toshkent markazi — default xarita markazi.
  var DEFAULT_CENTER = { lat: 41.3111, lng: 69.2797 };
  var DEFAULT_ZOOM = 12;

  var els = {
    findBtn: document.getElementById('findNearbyBtn'),
    districtSelect: document.getElementById('districtSelect'),
    radiusInput: document.getElementById('radiusInput'),
    status: document.getElementById('status'),
    list: document.getElementById('clinicList'),
    count: document.getElementById('count'),
    map: document.getElementById('map'),
  };

  var state = {
    map: null,
    markers: [],
    userMarker: null,
    centerMarker: null,
    districts: [],
    gmapsReady: false,
  };

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setStatus(msg, kind) {
    els.status.textContent = msg || '';
    els.status.className = 'muted status' + (kind ? ' is-' + kind : '');
  }

  function api(path, query) {
    var url = API_BASE + path;
    if (query) {
      var parts = [];
      Object.keys(query).forEach(function (k) {
        var v = query[k];
        if (v === undefined || v === null || v === '') return;
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
      });
      if (parts.length) url += '?' + parts.join('&');
    }
    return fetch(url, { headers: { Accept: 'application/json' } }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok || !body || body.success !== true) {
          var msg = (body && body.error && body.error.message) || ('HTTP ' + res.status);
          var err = new Error(msg);
          err.body = body;
          throw err;
        }
        return body.data;
      });
    });
  }

  function loadGoogleMaps(apiKey) {
    return new Promise(function (resolve, reject) {
      if (window.google && window.google.maps) return resolve(window.google.maps);
      if (!apiKey) return reject(new Error('GOOGLE_MAPS_BROWSER_KEY o\'rnatilmagan'));
      var cb = '__vetGmapsReady_' + Date.now();
      window[cb] = function () {
        delete window[cb];
        resolve(window.google.maps);
      };
      var s = document.createElement('script');
      s.async = true;
      s.defer = true;
      s.src =
        'https://maps.googleapis.com/maps/api/js?key=' +
        encodeURIComponent(apiKey) +
        '&callback=' + cb +
        '&v=weekly&language=uz&region=UZ';
      s.onerror = function () {
        delete window[cb];
        reject(new Error('Google Maps yuklanmadi'));
      };
      document.head.appendChild(s);
    });
  }

  function initMap() {
    state.map = new google.maps.Map(els.map, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
    state.gmapsReady = true;
  }

  function showMapFallback(msg) {
    els.map.innerHTML =
      '<div class="map-fallback">' +
      '<div><b>Xarita ko\'rsatilmadi</b><br/>' +
      esc(msg) +
      '<br/><small>Server admin: <code>GOOGLE_MAPS_BROWSER_KEY</code> ni .env ga qo\'shing.</small></div>' +
      '</div>';
  }

  function clearMarkers() {
    state.markers.forEach(function (m) { m.setMap(null); });
    state.markers = [];
  }

  function placeClinicMarkers(clinics) {
    if (!state.gmapsReady) return;
    clearMarkers();
    clinics.forEach(function (c) {
      var marker = new google.maps.Marker({
        position: { lat: c.latitude, lng: c.longitude },
        map: state.map,
        title: c.name,
      });
      var info = new google.maps.InfoWindow({
        content:
          '<div style="font-family:sans-serif;color:#111;max-width:240px">' +
          '<b>' + esc(c.name) + '</b><br/>' +
          '<small>' + esc(c.address || '') + '</small><br/>' +
          '<small>📞 ' + esc(c.phone || '') + '</small><br/>' +
          '<small>' + (c.isOpenNow ? '🟢 Hozir ochiq' : '🔴 Hozir yopiq') + ' · ' +
          esc((c.distanceKm != null ? c.distanceKm + ' km' : '')) + '</small>' +
          '</div>',
      });
      marker.addListener('click', function () { info.open(state.map, marker); });
      state.markers.push(marker);
    });
  }

  function placeCenterMarker(lat, lng, label) {
    if (!state.gmapsReady) return;
    if (state.centerMarker) state.centerMarker.setMap(null);
    state.centerMarker = new google.maps.Marker({
      position: { lat: lat, lng: lng },
      map: state.map,
      label: { text: label || 'M', color: '#fff', fontWeight: '700' },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#4f7cff',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    });
  }

  function fitToResults(centerLat, centerLng, clinics) {
    if (!state.gmapsReady) return;
    if (!clinics.length) {
      state.map.setCenter({ lat: centerLat, lng: centerLng });
      state.map.setZoom(13);
      return;
    }
    var bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: centerLat, lng: centerLng });
    clinics.forEach(function (c) { bounds.extend({ lat: c.latitude, lng: c.longitude }); });
    state.map.fitBounds(bounds, 60);
  }

  function renderList(clinics) {
    els.count.textContent = String(clinics.length);
    if (!clinics.length) {
      els.list.innerHTML =
        '<li class="clinic-card"><div class="muted">Bu hududda klinika topilmadi.</div></li>';
      return;
    }
    els.list.innerHTML = clinics.map(function (c, idx) {
      var open = c.isOpenNow
        ? '<span class="badge">Ochiq</span>'
        : '<span class="badge badge--closed">Yopiq</span>';
      var rating = c.averageRating != null
        ? '★ ' + c.averageRating + ' (' + c.reviewCount + ')'
        : 'Sharhsiz';
      return (
        '<li class="clinic-card" data-idx="' + idx + '">' +
          '<div class="clinic-card__head">' +
            '<div class="clinic-card__name">' + esc(c.name) + '</div>' +
            '<div class="clinic-card__dist">' + (c.distanceKm != null ? c.distanceKm + ' km' : '') + '</div>' +
          '</div>' +
          '<div class="clinic-card__addr">' + esc(c.address || '') + '</div>' +
          '<div class="clinic-card__meta">' +
            open +
            '<span>' + esc(rating) + '</span>' +
            '<span>📞 ' + esc(c.phone || '') + '</span>' +
          '</div>' +
        '</li>'
      );
    }).join('');

    Array.prototype.forEach.call(els.list.querySelectorAll('.clinic-card'), function (card) {
      card.addEventListener('click', function () {
        var idx = Number(card.getAttribute('data-idx'));
        var c = clinics[idx];
        if (!state.gmapsReady || !c) return;
        state.map.panTo({ lat: c.latitude, lng: c.longitude });
        state.map.setZoom(15);
        Array.prototype.forEach.call(els.list.querySelectorAll('.clinic-card'), function (n) {
          n.classList.remove('is-active');
        });
        card.classList.add('is-active');
        var marker = state.markers[idx];
        if (marker) google.maps.event.trigger(marker, 'click');
      });
    });
  }

  function readRadius() {
    var v = Number(els.radiusInput.value);
    if (!Number.isFinite(v) || v <= 0) return 5;
    return Math.min(v, 50);
  }

  async function searchNearby(opts) {
    var radiusKm = readRadius();
    var query = { radiusKm: radiusKm };
    if (opts.district) query.district = opts.district;
    if (opts.lat != null && opts.lng != null) {
      query.lat = opts.lat;
      query.lng = opts.lng;
    }

    setStatus('Qidirilmoqda…');
    try {
      var data = await api('/clinics/nearby', query);
      var clinics = data.clinics || [];
      var center = data.searchCenter || (opts.lat != null ? { lat: opts.lat, lng: opts.lng } : null);

      if (center && center.lat != null) {
        placeCenterMarker(center.lat, center.lng, opts.label || 'M');
        placeClinicMarkers(clinics);
        fitToResults(center.lat, center.lng, clinics);
      } else {
        placeClinicMarkers(clinics);
      }

      renderList(clinics);
      setStatus(clinics.length + ' ta klinika topildi (' + radiusKm + ' km radius)', 'ok');
    } catch (err) {
      setStatus(err.message || 'Xato yuz berdi', 'error');
    }
  }

  function findByGeolocation() {
    if (!('geolocation' in navigator)) {
      setStatus('Brauzer geolocation\'ni qo\'llab-quvvatlamaydi', 'error');
      return;
    }
    setStatus('Joylashuv aniqlanmoqda…');
    els.findBtn.disabled = true;
    // Geolocation button bosilganda radius majburiy 5 km bo'ladi.
    els.radiusInput.value = '5';
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        els.findBtn.disabled = false;
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        if (state.gmapsReady && state.userMarker) state.userMarker.setMap(null);
        if (state.gmapsReady) {
          state.userMarker = new google.maps.Marker({
            position: { lat: lat, lng: lng },
            map: state.map,
            title: 'Mening joylashuvim',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#22d3a3',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
            },
          });
        }
        els.districtSelect.value = '';
        searchNearby({ lat: lat, lng: lng, label: 'Siz' });
      },
      function (err) {
        els.findBtn.disabled = false;
        setStatus('Joylashuvni olishda xato: ' + err.message, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function fillDistrictDropdown(districts) {
    state.districts = districts;
    var html = '<option value="">— Tumanni tanlang —</option>';
    districts.forEach(function (d) {
      html += '<option value="' + esc(d.key) + '">' +
        esc(d.name) + ' (' + d.clinicCount + ')' +
        '</option>';
    });
    els.districtSelect.innerHTML = html;
  }

  async function loadDistricts() {
    try {
      var data = await api('/clinics/districts');
      fillDistrictDropdown(data.districts || []);
    } catch (err) {
      setStatus('Tumanlar ro\'yxatini yuklab bo\'lmadi: ' + err.message, 'error');
    }
  }

  async function loadConfigAndInit() {
    try {
      var cfg = await api('/config/public');
      var key = cfg && cfg.googleMapsBrowserKey;
      if (!key) {
        showMapFallback('Google Maps API kaliti sozlanmagan.');
        return;
      }
      await loadGoogleMaps(key);
      initMap();
    } catch (err) {
      showMapFallback(err.message || 'Xarita yuklanmadi');
    }
  }

  function bindEvents() {
    els.findBtn.addEventListener('click', findByGeolocation);
    els.districtSelect.addEventListener('change', function () {
      var key = els.districtSelect.value;
      if (!key) return;
      var d = state.districts.find(function (x) { return x.key === key; });
      if (!d) return;
      searchNearby({ district: key, lat: d.lat, lng: d.lng, label: d.name });
    });
    els.radiusInput.addEventListener('change', function () {
      var key = els.districtSelect.value;
      if (!key) return;
      var d = state.districts.find(function (x) { return x.key === key; });
      if (d) searchNearby({ district: key, lat: d.lat, lng: d.lng, label: d.name });
    });
  }

  bindEvents();
  loadDistricts();
  loadConfigAndInit();
})();
