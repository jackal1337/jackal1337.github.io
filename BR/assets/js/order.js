$(document).ready(function() {
    $('#nextBtn').click(function() {
        if ($('#terms').is(':checked')) {
            $('#termsCard').hide();
            $('#orderForm').show();
        } else {
            $('#terms').addClass('is-invalid');
        }
    });

    $('form').submit(function(e) {
        e.preventDefault();

        const name = $('#name').val();
        const dob = $('#dob').val();
        const phone = $('#phone').val();
        const email = $('#email').val();
        const duration = $('#duration').val();

        fetch("https://api.notjackal.eu/api/blueride", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                dob: dob,
                phone: phone,
                email: email,
                duration: duration
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
