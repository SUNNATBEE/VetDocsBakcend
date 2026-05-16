// Toshkent tumanlari katalogi — public dropdown va filter validation uchun.
// `key` — DB'da saqlanadigan kanonik qiymat. `name` — UI'da ko‘rsatiladigan nom.
// `lat/lng` — tuman markazi (xarita default markazi sifatida ishlatiladi).
const TASHKENT_DISTRICTS = [
  { key: 'Bektemir', name: 'Bektemir', lat: 41.226, lng: 69.339 },
  { key: 'Chilonzor', name: 'Chilonzor', lat: 41.275, lng: 69.205 },
  { key: 'Mirobod', name: 'Mirobod', lat: 41.295, lng: 69.282 },
  { key: 'Mirzo Ulug‘bek', name: 'Mirzo Ulug‘bek', lat: 41.325, lng: 69.336 },
  { key: 'Olmazor', name: 'Olmazor', lat: 41.347, lng: 69.226 },
  { key: 'Sergeli', name: 'Sergeli', lat: 41.230, lng: 69.219 },
  { key: 'Shayxontohur', name: 'Shayxontohur', lat: 41.325, lng: 69.236 },
  { key: 'Uchtepa', name: 'Uchtepa', lat: 41.288, lng: 69.184 },
  { key: 'Yakkasaroy', name: 'Yakkasaroy', lat: 41.286, lng: 69.252 },
  { key: 'Yangi Hayot', name: 'Yangi Hayot', lat: 41.196, lng: 69.255 },
  { key: 'Yashnobod', name: 'Yashnobod', lat: 41.295, lng: 69.330 },
  { key: 'Yunusobod', name: 'Yunusobod', lat: 41.367, lng: 69.291 },
];

const TASHKENT_DISTRICT_KEYS = TASHKENT_DISTRICTS.map((d) => d.key);

module.exports = {
  TASHKENT_DISTRICTS,
  TASHKENT_DISTRICT_KEYS,
};
