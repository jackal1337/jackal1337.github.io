$(document).ready(function() {
    const discordWebhookUrl = '${{ secrets.DISCORD_WEBHOOK_URL }}';

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

        var message = {
            embeds: [embed]
        };

        fetch(discordWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        }).then(response => {
            if (!response.ok) {
                console.error('Nepodařilo se odeslat data');
            } else {
                console.log('Data úspěšně odeslána');
                $('#orderSuccessModal').modal('show');
                $('form')[0].reset();
            }
        }).catch(error => {
            console.error('Nepodařilo se odeslat data', error);
            alert('Při odesílání objednávky došlo k chybě. Zkuste to prosím znovu.');
        });
    });
});
