document.getElementById('orderForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const contact = document.getElementById('contact').value;
    const message = document.getElementById('message').value;

    const data = {
        name,
        contact,
        message
    };

    fetch('https://jackal.studio/api/guard24.js', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        alert('Objednávka byla úspěšně odeslána!');
        document.getElementById('orderForm').reset();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Nastala chyba při odesílání objednávky.');
    });
});
