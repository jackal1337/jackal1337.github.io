import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyASOGujLflPhIpDmTMIUc7MD0cqvsIfdGI",
    authDomain: "doprava-cc160.firebaseapp.com",
    databaseURL: "https://doprava-cc160-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "doprava-cc160",
    storageBucket: "doprava-cc160.appspot.com",
    messagingSenderId: "415336428339",
    appId: "1:415336428339:web:55299a4aede90007954446",
    measurementId: "G-0Z2MRPH54B"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const recordForm = document.getElementById('recordForm');
recordForm.addEventListener('submit', function (event) {
    event.preventDefault(); // Zabránit výchozímu odeslání formuláře

    const location = document.getElementById('location').value;
    const description = document.getElementById('description').value;
    const policePresence = document.getElementById('police_presence').value === 'yes' ? 'Ano' : 'Ne';
    const eventTypeElement = document.getElementById('event_type');
    const name = document.getElementById('name').value;
    const eventType = eventTypeElement.options[eventTypeElement.selectedIndex].text;
    let imageLink = document.getElementById('imageLink').value.trim(); // Přidáme získání odkazu na obrázek a odstraníme přebytečné mezery

    // Pokud odkaz obsahuje "imgur.com" a je ve formátu "https://i.imgur.com/XXX.jpeg", ponecháme ho, jinak ho vyprázdníme
    if (!imageLink.includes("imgur.com") || !imageLink.startsWith("https://i.imgur.com/") || !imageLink.endsWith(".jpeg")) {
        imageLink = '';
    }

    const currentDate = new Date();
    const date = currentDate.toLocaleDateString('cs-CZ');
    const time = currentDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

    const recordsRef = ref(database, 'records');
    push(recordsRef, {
        location,
        description,
        policePresence,
        eventType,
        name,
        date,
        time,
        imageLink
    });

    getRecords();
});

function getRecords() {
    const recordsRef = ref(database, 'records');
    onValue(recordsRef, (snapshot) => {
        let records = [];
        snapshot.forEach((childSnapshot) => {
            records.push(childSnapshot.val());
        });

        records.reverse(); // Převrátit pořadí, aby nejnovější záznamy byly nahoře

        const recordListBody = document.getElementById('recordListBody');
        recordListBody.innerHTML = '';

        records.forEach((record) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.date} ${record.time}</td>
                <td>${record.location}</td>
                <td>${record.description}</td>
                <td>${record.policePresence}</td>
                <td>${record.eventType}</td>
                <td>${record.name}</td>
                <td>${record.imageLink ? `<img src="${record.imageLink}" alt="Obrázek" style="max-width: 100px; cursor: pointer;" onclick="openImage('${record.imageLink}')">` : 'N/A'}</td>
            `;
            recordListBody.appendChild(row);
        });
    });
}

function openImage(imageUrl) {
    window.open(imageUrl, '_blank');
}

document.addEventListener("DOMContentLoaded", function () {
    getRecords();
});