$(document).ready(function() {
    $('form').submit(function(e) {
        e.preventDefault();

        const name = $('#name').val();
        const email = $('#email').val();
        const message=  $('#message').val();

        fetch("https://www.jackal.studio/api/guard24", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                email: email,
                message: message,
            }),
        })
        .then(response => {
            if (!response.ok) {
                console.error('Nepodařilo se odeslat data');
            } else {
                console.log('Data úspěšně odeslána');
                $('#orderSuccessModal').modal('show'); 
            }
        })
        .catch(error => {
            console.error('Nepodařilo se odeslat data', error);
        });
    });
});