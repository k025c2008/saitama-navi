// gentle scroll reveal (skipped automatically when reduced motion is preferred)
const revealItems = document.querySelectorAll('.reveal');
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealItems.forEach(el => el.classList.add('in'));
} else {
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('in'), i * 80);
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    revealItems.forEach(el => io.observe(el));
}

// countdown to the next Saitama matsuri
const matsuriDates = [
    { name: '秩父・芝桜まつり', month: 4, day: 20 },
    { name: '熊谷うちわ祭', month: 7, day: 20 },
    { name: '川越まつり', month: 10, day: 18 },
    { name: '秩父夜祭', month: 12, day: 2 },
];

function nextMatsuri(today) {
    let best = null;
    matsuriDates.forEach(({ name, month, day }) => {
        [today.getFullYear(), today.getFullYear() + 1].forEach(year => {
            const date = new Date(year, month - 1, day);
            if (date >= today && (!best || date < best.date)) {
                best = { name, date };
            }
        });
    });
    return best;
}

const countdownEl = document.querySelector('#countdown');
if (countdownEl) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = nextMatsuri(today);
    const daysLeft = Math.round((next.date - today) / 86400000);
    countdownEl.querySelector('.days').textContent = daysLeft;
    countdownEl.querySelector('.name').textContent = next.name;
}

// current weather in Saitama City (Open-Meteo, no API key required)
const weatherEl = document.querySelector('#weather');
if (weatherEl) {
    const weatherText = {
        0: ['☀️', '快晴'], 1: ['🌤️', 'ほぼ晴れ'], 2: ['⛅', '晴れ時々曇り'], 3: ['☁️', '曇り'],
        45: ['🌫️', '霧'], 48: ['🌫️', '霧'],
        51: ['🌦️', '霧雨'], 53: ['🌦️', '霧雨'], 55: ['🌦️', '霧雨'],
        61: ['🌧️', '雨'], 63: ['🌧️', '雨'], 65: ['🌧️', '強い雨'],
        71: ['🌨️', '雪'], 73: ['🌨️', '雪'], 75: ['🌨️', '大雪'],
        80: ['🌧️', 'にわか雨'], 81: ['🌧️', 'にわか雨'], 82: ['🌧️', '激しいにわか雨'],
        95: ['⛈️', '雷雨'], 96: ['⛈️', '雷雨'], 99: ['⛈️', '雷雨'],
    };

    fetch('https://api.open-meteo.com/v1/forecast?latitude=35.8617&longitude=139.6455&current=temperature_2m,weather_code&timezone=Asia%2FTokyo')
        .then(res => res.json())
        .then(data => {
            const current = data.current;
            const [icon, desc] = weatherText[current.weather_code] || ['🌡️', '不明'];
            weatherEl.querySelector('.w-icon').textContent = icon;
            weatherEl.querySelector('.w-temp').textContent = Math.round(current.temperature_2m);
            weatherEl.querySelector('.w-desc').textContent = desc;
        })
        .catch(() => {
            weatherEl.querySelector('.w-desc').textContent = '取得できませんでした';
        });
}

// back-to-top button
const toTopBtn = document.querySelector('#to-top');
if (toTopBtn) {
    window.addEventListener('scroll', () => {
        toTopBtn.classList.toggle('show', window.scrollY > 400);
    });

    toTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
