$(document).ready(function() {
    $('#orderForm').submit(function(e) {
        e.preventDefault();

        const name = $('#name').val();
        const email = $('#email').val();
        const phone = $('#phone').val();
        const message = $('#message').val();

        fetch("https://api.jackal.studio/api/guard24", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                email: email,
                phone: phone,
                message: message,
            }),
        })
        .then(response => {
            if (!response.ok) {
                console.error('Nepodařilo se odeslat data');
            } else {
                console.log('Data úspěšně odeslána');

                $('#orderForm')[0].reset();
                $('#orderSuccessToast').toast('show');
            }
        })
        .catch(error => {
            console.error('Nepodařilo se odeslat data', error);
        });
    });
});
