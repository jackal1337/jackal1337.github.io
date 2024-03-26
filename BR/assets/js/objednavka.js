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

        var message = {
            embeds: [{
                title: 'Nová objednávka',
                color: 0x6592e6,
                fields: [
                    { name: 'Jméno a příjmení', value: name },
                    { name: 'Datum narození', value: dob },
                    { name: 'Telefonní číslo', value: phone },
                    { name: 'Email', value: email },
                    { name: 'Doba pronájmu (v týdnech)', value: duration }
                ]
            }]
        };

        $.ajax({
            url: discordWebhookUrl,
            type: 'POST',
            data: JSON.stringify(message),
            contentType: 'application/json',
            success: function() {
                $('#orderSuccessModal').modal('show');
                $('form')[0].reset();
            },
            error: function() {
                alert('Při odesílání objednávky došlo k chybě. Zkuste to prosím znovu.');
            }
        });
    });
});
