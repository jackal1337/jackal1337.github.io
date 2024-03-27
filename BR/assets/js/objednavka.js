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

        var name = $('#name').val();
        var dob = $('#dob').val();
        var phone = $('#phone').val();
        var email = $('#email').val();
        var duration = $('#duration').val();

        var webhookUrl = '${{ vars.WEBHOOKURL }}';
        var embed = {
            title: 'Nová objednávka',
            color: 0x6592e6,
            fields: [
                { name: 'Jméno a příjmení', value: name },
                { name: 'Datum narození', value: dob },
                { name: 'Telefonní číslo', value: phone },
                { name: 'Email', value: email },
                { name: 'Doba pronájmu (v týdnech)', value: duration }
            ]
        };

        fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                embeds: [
                    embed
                ],
            }),
        }).then(response => {
            if (!response.ok) {
                console.error('Nepodařilo se odeslat data');
            } else {
                console.log('Data úspěšně odeslána');
            }
        }).catch(error => {
            console.error('Nepodařilo se odeslat data', error);
        });
    });
});
