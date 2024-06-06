AOS.init();

const guards = [
    {
        photo: "https://cdn.leosight.cz/skimo/skins/211.png",
        name: "Věra Rodriguez",
        rating: 2.5,
        isHandler: true,
        handlerPhoto: "https://cdn.leosight.cz/skimo/skins/311.png",
        weapon: "Taser M26",
        available: true,
        pay: "14.200 Kč"
    },
    {
        photo: "https://cdn.leosight.cz/skimo/skins/163.png",
        name: "Josef Malý",
        rating: 4,
        isHandler: true,
        handlerPhoto: "https://cdn.leosight.cz/skimo/skins/307.png",
        weapon: "0",
        available: true,
        pay: "16.600 Kč"
    },
    {
        photo: "https://cdn.leosight.cz/skimo/skins/296.png",
        name: "Antonín Černý",
        rating: 4,
        isHandler: true,
        handlerPhoto: "https://cdn.leosight.cz/skimo/skins/307.png",
        weapon: "Taser M26",
        available: true,
        pay: "18.000 Kč"
    },
    {
        photo: "https://cdn.leosight.cz/skimo/skins/296.png",
        name: "Matěj Fiala",
        rating: 4.5,
        isHandler: true,
        handlerPhoto: "https://cdn.leosight.cz/skimo/skins/297.png",
        weapon: "0",
        available: true,
        pay: "17.350 Kč"
    },
    {
        photo: "https://cdn.leosight.cz/skimo/skins/037.png",
        name: "Andrew Harris",
        rating: 3.5,
        isHandler: true,
        handlerPhoto: "https://cdn.leosight.cz/skimo/skins/311.png",
        weapon: "0",
        available: true,
        pay: "14.200 Kč"
    },
    {
        photo: "https://cdn.leosight.cz/skimo/skins/296.png",
        name: "Richard White",
        rating: 4,
        isHandler: false,
        handlerPhoto: "https://cdn.leosight.cz/skimo/skins/297.png",
        weapon: "Glock 17",
        available: true,
        pay: "16.600 Kč"
    },
    {
        photo: "https://cdn.leosight.cz/skimo/skins/197.png",
        name: "Nina Williams",
        rating: 4.5,
        isHandler: false,
        handlerPhoto: "https://cdn.leosight.cz/skimo/skins/297.png",
        weapon: "0",
        available: true,
        pay: "16.550 Kč"
    },
    {
        photo: "https://cdn.leosight.cz/skimo/skins/117.png",
        name: "Igor Makarov",
        rating: 4.5,
        isHandler: false,
        handlerPhoto: "https://cdn.leosight.cz/skimo/skins/297.png",
        weapon: "0",
        available: true,
        pay: "14.200 Kč"
    },
    {
        photo: "https://cdn.leosight.cz/skimo/skins/164.png",
        name: "Diego Sanchez",
        rating: 4,
        isHandler: false,
        handlerPhoto: "https://cdn.leosight.cz/skimo/skins/297.png",
        weapon: "0",
        available: true,
        pay: "11.900 Kč"
    },
    {
        photo: "https://cdn.leosight.cz/skimo/skins/166.png",
        name: "Alexander Wright",
        rating: 4,
        isHandler: false,
        handlerPhoto: "https://cdn.leosight.cz/skimo/skins/297.png",
        weapon: "0",
        available: true,
        pay: "11.900 Kč"
    },
        {
        photo: "https://cdn.leosight.cz/skimo/skins/076.png",
        name: "Ludmila Bláhová",
        rating: 4,
        isHandler: false,
        handlerPhoto: "https://cdn.leosight.cz/skimo/skins/297.png",
        weapon: "0",
        available: true,
        pay: "11.900 Kč"
    },
];

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStars = rating % 1 !== 0 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStars;
    return `${'<i class="fas fa-star"></i>'.repeat(fullStars)}${'<i class="fas fa-star-half-alt"></i>'.repeat(halfStars)}${'<i class="far fa-star"></i>'.repeat(emptyStars)}`;
}

function renderGuards(guards) {
    const tableBody = document.getElementById('guards-table-body');

    guards.sort((a, b) => {
        const payA = parseInt(a.pay.replace(/\s|Kč/g, ''), 10);
        const payB = parseInt(b.pay.replace(/\s|Kč/g, ''), 10);
        return payA - payB;
    });

    guards.forEach(guard => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="p-0" data-label="Jméno"><img class="guard-photo me-2" src="${guard.photo}">${guard.name}</td>
            <td class="rating" data-label="Hodnocení">${generateStars(guard.rating)}</td>
            <td class="p-0" data-label="Psovod">${guard.isHandler ? `<img class="guard-photo" src="${guard.handlerPhoto}">` : '<i class="fas fa-times px-3"></i>'}</td>
            <td data-label="Zbraň">${guard.weapon === "0" ? '<i class="fas fa-times"></i>' : guard.weapon}</td>
            <td class="availability" data-label="Dostupný">${guard.available ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>'}</td>
            <td class="text-end" data-label="Plat za směnu*">${guard.pay}</td>
        `;
        tableBody.appendChild(row);
    });
}

renderGuards(guards);
